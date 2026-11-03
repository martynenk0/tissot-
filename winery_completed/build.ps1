# Сборка одного self-contained HTML: three.js + все модули инлайном
$ErrorActionPreference = 'Stop'
$root = "C:\Users\david\Downloads\winery_completed"

$tpl = Get-Content "$root\src\template.html" -Raw -Encoding UTF8
$three = Get-Content "$root\assets\three.min.js" -Raw -Encoding UTF8

$parts = @('env.js', 'dial.js', 'back.js', 'watch.js', 'main.js') | ForEach-Object {
  "`n/* ===== $_ ===== */`n" + (Get-Content "$root\src\$_" -Raw -Encoding UTF8)
}
$app = $parts -join "`n"

$html = $tpl.Replace('/*__THREE__*/', $three).Replace('/*__APP__*/', $app)

# PNG циферблата -> base64 (встроен в файл)
$dialPath = "$root\assets\dial_tex.jpg"
if (Test-Path $dialPath) {
  $dialB64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($dialPath))
  $dialJs = 'window.DIAL_IMG="data:image/jpeg;base64,' + $dialB64 + '";'
  $html = $html.Replace('/*__DIAL__*/', $dialJs)
  "DIAL: embedded ({0:N0} KB base64)" -f ($dialB64.Length / 1KB)
} else {
  $html = $html.Replace('/*__DIAL__*/', 'window.DIAL_IMG=null;')
  "DIAL: not found, procedural fallback"
}

$out = "$root\tissot-lelocle.html"
[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding($false)))

$fi = Get-Item $out
"BUILD OK: {0}  ({1:N0} KB)" -f $fi.Name, ($fi.Length / 1KB)
