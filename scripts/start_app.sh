#!/bin/bash
cd /home/ec2-user/app
nohup npm start > /home/ec2-user/app.log 2>&1 &
echo $! > /home/ec2-user/app.pid