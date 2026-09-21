#!/bin/bash
if [ -f /home/ec2-user/app.pid ]; then
  PID=$(cat /home/ec2-user/app.pid)
  kill $PID || true
  rm /home/ec2-user/app.pid
fi