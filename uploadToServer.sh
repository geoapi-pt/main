# NOTE: This script is only to be used by the owner of the project
cd "$(dirname "$0")"
npm ci
rsync --verbose --compress --recursive --links --times --delete --exclude '*.sh' --exclude '.git*' --exclude 'counters.json' . jfolpf@contabo.joaopimentel.com:/var/www/geoapipt/
ssh jfolpf@contabo.joaopimentel.com -- '/usr/local/bin/pm2 reload geoapi.pt'
