#!/bin/bash
IP=$1
npm install
watch -n1 "rsync -avz --delete * root@$IP:/var/www/html/webrtc-phone/"