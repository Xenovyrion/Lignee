# Gestion du relais Discord de Lignée : ajouter, retirer ou lister les membres, mettre à jour le relais.
# Lancement (depuis n'importe où) : pwsh -File "<dossier du dépôt>\relais\gerer-relais.ps1"
#
# Cloudflare ne permet pas de relire un secret : le script garde donc sa propre liste des membres
# (identifiant Discord, pseudo, clé) dans membres.local.dat, à côté de ce script. Ce fichier est chiffré avec
# ton compte Windows (DPAPI) : lisible uniquement par toi, sur ce PC. Il est ignoré par git.
# Aucune clé n'est affichée à l'écran : le message à envoyer au membre est copié dans le presse-papiers.

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -lt 7) {
  Write-Host "Ce script demande PowerShell 7 : lance-le avec « pwsh -File gerer-relais.ps1 » (installation : winget install Microsoft.PowerShell)."
  exit 1
}
Set-Location $PSScriptRoot
$Fichier = Join-Path $PSScriptRoot "membres.local.dat"

function Lire-Donnees {
  if (-not (Test-Path $Fichier)) { return [pscustomobject]@{ url = ""; membres = @() } }
  $securise = Get-Content -Raw $Fichier | ConvertTo-SecureString
  $json = [System.Net.NetworkCredential]::new("", $securise).Password
  $d = $json | ConvertFrom-Json
  if (-not $d.membres) { $d.membres = @() }
  return $d
}

function Enregistrer-Donnees($d) {
  $json = $d | ConvertTo-Json -Depth 4 -Compress
  ConvertTo-SecureString $json -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -NoNewline $Fichier
}

function Nouvelle-Cle {
  -join ([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32) | ForEach-Object { $_.ToString("x2") })
}

function Connecter {
  $qui = npx wrangler whoami 2>&1 | Out-String
  if ($qui -notmatch "associated with the email|You are logged in") {
    Write-Host "Connexion à Cloudflare (une page va s'ouvrir dans le navigateur)..." -ForegroundColor Cyan
    npx wrangler login
    if ($LASTEXITCODE) { throw "Connexion à Cloudflare impossible." }
  }
}

function Envoyer-Membres($d) {
  if (-not $d.membres.Count) { Write-Host "Aucun membre : rien à envoyer." -ForegroundColor Yellow; return $false }
  $valeur = ($d.membres | ForEach-Object { "$($_.id):$($_.cle)" }) -join ","
  Connecter
  Write-Host "Mise à jour de la liste des membres sur le relais..." -ForegroundColor Cyan
  $valeur | npx wrangler secret put MEMBRES | Out-Null
  if ($LASTEXITCODE) { Write-Host "Échec de l'envoi : la liste locale est gardée, réessaie." -ForegroundColor Red; return $false }
  Write-Host "Relais à jour ($($d.membres.Count) membre(s))." -ForegroundColor Green
  return $true
}

function Copier-Message($d, $m) {
  $texte = @"
Voici ton accès aux notifications d'enclos de Lignée (garde-le pour toi) :
- Adresse du relais : $($d.url)
- Ta clé : $($m.cle)
Dans Lignée : Paramètres → Minuteurs d'enclos, colle les deux, clique « Tester » puis « Enregistrer ».
"@
  Set-Clipboard -Value $texte
  Write-Host "Message pour $($m.pseudo) copié dans le presse-papiers : colle-le-lui en MESSAGE PRIVÉ, puis copie autre chose pour l'effacer." -ForegroundColor Green
}

function Choisir-Membre($d, $action) {
  if (-not $d.membres.Count) { Write-Host "Aucun membre enregistré." -ForegroundColor Yellow; return $null }
  for ($i = 0; $i -lt $d.membres.Count; $i++) { Write-Host ("  {0}. {1} ({2})" -f ($i + 1), $d.membres[$i].pseudo, $d.membres[$i].id) }
  $n = Read-Host "Numéro du membre à $action (Entrée pour annuler)"
  if (-not $n) { return $null }
  $i = [int]$n - 1
  if ($i -lt 0 -or $i -ge $d.membres.Count) { Write-Host "Numéro invalide." -ForegroundColor Red; return $null }
  return $d.membres[$i]
}

$d = Lire-Donnees
if (-not $d.url) {
  Write-Host "Premier lancement." -ForegroundColor Cyan
  do { $d.url = (Read-Host "Adresse du relais (ex. https://lignee-relais.ma-guilde.workers.dev)").Trim().TrimEnd("/") } until ($d.url -match "^https://[^/\s]+$")
  Enregistrer-Donnees $d
  Write-Host "Ajoute maintenant chaque membre déjà inscrit (toi compris), avec sa clé actuelle s'il en a une : sinon une nouvelle clé lui sera donnée." -ForegroundColor Yellow
}

while ($true) {
  Write-Host ""
  Write-Host "=== Relais Lignée : $($d.url) — $($d.membres.Count) membre(s) ===" -ForegroundColor Cyan
  Write-Host "  1. Ajouter un membre"
  Write-Host "  2. Retirer un membre"
  Write-Host "  3. Lister les membres"
  Write-Host "  4. Renvoyer son accès à un membre (même clé)"
  Write-Host "  5. Donner une nouvelle clé à un membre (l'ancienne ne marche plus)"
  Write-Host "  6. Mettre à jour le relais (après une nouvelle version de Lignée)"
  Write-Host "  0. Quitter"
  $choix = Read-Host "Choix"
  try {
    switch ($choix) {
      "1" {
        $id = (Read-Host "Identifiant Discord du membre").Trim()
        if ($id -notmatch "^\d{17,20}$") { Write-Host "Un identifiant Discord fait 17 à 20 chiffres." -ForegroundColor Red; break }
        if ($d.membres | Where-Object { $_.id -eq $id }) { Write-Host "Ce membre est déjà inscrit (option 4 pour lui renvoyer son accès)." -ForegroundColor Yellow; break }
        $pseudo = (Read-Host "Pseudo (pour t'y retrouver)").Trim()
        if (-not $pseudo) { $pseudo = $id }
        $existante = Read-Host "Il a déjà une clé ? Colle-la, sinon Entrée pour en créer une" -MaskInput
        $cle = if ($existante.Trim().Length -ge 32) { $existante.Trim() } else { Nouvelle-Cle }
        $m = [pscustomobject]@{ id = $id; pseudo = $pseudo; cle = $cle }
        $d.membres = @($d.membres) + $m
        Enregistrer-Donnees $d
        if ((Envoyer-Membres $d) -and -not $existante.Trim()) { Copier-Message $d $m }
      }
      "2" {
        $m = Choisir-Membre $d "retirer"
        if ($m -and (Read-Host "Retirer $($m.pseudo) ? (o/N)") -eq "o") {
          $d.membres = @($d.membres | Where-Object { $_.id -ne $m.id })
          Enregistrer-Donnees $d
          if ($d.membres.Count) { [void](Envoyer-Membres $d) } else { Write-Host "Liste vide : le relais garde l'ancienne liste. Ajoute un membre pour la remplacer." -ForegroundColor Yellow }
        }
      }
      "3" { if ($d.membres.Count) { $d.membres | ForEach-Object { Write-Host "  - $($_.pseudo) ($($_.id))" } } else { Write-Host "Aucun membre." } }
      "4" { $m = Choisir-Membre $d "recontacter"; if ($m) { Copier-Message $d $m } }
      "5" {
        $m = Choisir-Membre $d "renouveler"
        if ($m) {
          $m.cle = Nouvelle-Cle
          Enregistrer-Donnees $d
          if (Envoyer-Membres $d) { Copier-Message $d $m }
        }
      }
      "6" { Connecter; npx wrangler deploy }
      "0" {
        $qui = npx wrangler whoami 2>&1 | Out-String
        if ($qui -match "associated with the email|You are logged in") { npx wrangler logout | Out-Null; Write-Host "Déconnecté de Cloudflare." -ForegroundColor Green }
        exit
      }
      default { Write-Host "Choix inconnu." -ForegroundColor Yellow }
    }
  } catch {
    Write-Host "Erreur : $($_.Exception.Message)" -ForegroundColor Red
  }
}
