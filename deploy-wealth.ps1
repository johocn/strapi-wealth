# 部署 uni-app H5 产物到服务器 v.joho.cn/wealth 子目录（财富中心，joho 主机）
# 只替换 index/wealth 目录，不触碰站点根目录的 index.html/assets（shao 课程端）
param(
  [string]$Local = "E:\code\strapi-wealth\dist\build\h5",
  [string]$HostName = "joho",
  [string]$RemoteSite = "/opt/1panel/apps/openresty/openresty/www/sites/v.joho.cn"
)
$ErrorActionPreference = "Stop"

$RemoteWealth = "$RemoteSite/index/wealth"
$Tmp = "/tmp/wealth_client_upload"

if (-not (Test-Path "$Local\index.html")) {
  throw "本地产物缺失: $Local\index.html"
}
Write-Host "[1/5] 本地产物 OK: $Local"

Write-Host "[2/5] 备份远程 wealth 目录..."
ssh $HostName "sudo rm -rf ${RemoteWealth}_backup && sudo cp -a $RemoteWealth ${RemoteWealth}_backup 2>/dev/null || echo no-previous-backup"

Write-Host "[3/5] 上传产物到 $Tmp ..."
ssh $HostName "rm -rf $Tmp && mkdir -p $Tmp"
scp -r -- "${Local}\assets" "${HostName}:${Tmp}/"
if (Test-Path "$Local\static") { scp -r -- "${Local}\static" "${HostName}:${Tmp}/" }
scp -- "${Local}\index.html" "${HostName}:${Tmp}/"

Write-Host "[4/5] 替换 wealth 目录..."
ssh $HostName "sudo mkdir -p $RemoteWealth && cd $RemoteWealth && sudo rm -rf assets static index.html && sudo cp -a $Tmp/. ."

Write-Host "[5/5] 校验并清理临时文件..."
$check = ssh $HostName "ls $RemoteWealth/index.html $RemoteWealth/assets >/dev/null && echo SYNC_OK || echo SYNC_FAIL; rm -rf $Tmp"
Write-Host $check
if ($check -notmatch "SYNC_OK") { throw "部署校验失败" }
Write-Host "部署完成: https://v.joho.cn/wealth/"
