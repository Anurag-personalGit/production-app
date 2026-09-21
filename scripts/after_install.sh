#!/bin/bash
if ! command -v node &> /dev/null; then
  curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
  yum install -y nodejs
fi
cd /home/ec2-user/app
npm install --production