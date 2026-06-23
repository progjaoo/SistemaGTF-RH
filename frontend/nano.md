Last login: Fri Jun 19 08:18:35 on console
joaomvalente@88FM-PC-006 ~ % ssh -P 22022 root@143.95.213.195                                                      
ssh: connect to host 143.95.213.195 port 22: Connection refused
joaomvalente@88FM-PC-006 ~ % ssh root@143.95.213.195  
ssh: connect to host 143.95.213.195 port 22: Connection refused
joaomvalente@88FM-PC-006 ~ % ssh -p 22022 root@143.95.213.195 
root@143.95.213.195's password: 
Welcome to Ubuntu 22.04.5 LTS (GNU/Linux 6.8.0-124-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

 System information as of Fri Jun 19 11:16:20 AM -03 2026

  System load:  0.0                Processes:             113
  Usage of /:   39.4% of 18.07GB   Users logged in:       0
  Memory usage: 27%                IPv4 address for ens3: 143.95.213.195
  Swap usage:   0%

 * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
   just raised the bar for easy, resilient and secure K8s cluster deployment.

   https://ubuntu.com/engage/secure-kubernetes-at-the-edge

Expanded Security Maintenance for Applications is not enabled.

9 updates can be applied immediately.
3 of these updates are standard security updates.
To see these additional updates run: apt list --upgradable

4 additional security updates can be applied with ESM Apps.
Learn more about enabling ESM Apps service at https://ubuntu.com/esm


Last login: Wed Jun 17 21:43:23 2026 from 138.59.121.110
root@vps-15408671:~# cd var/www/
-bash: cd: var/www/: No such file or directory
root@vps-15408671:~# cd /var/www/
root@vps-15408671:/var/www# ls
html  portal-noticias  sistema-chamados  sistema-ibope
root@vps-15408671:/var/www# mkdir sistema-rh
root@vps-15408671:/var/www# cd sistema-rh
root@vps-15408671:/var/www/sistema-rh# mkdir api
root@vps-15408671:/var/www/sistema-rh# mkdir frontend
root@vps-15408671:/var/www/sistema-rh# ls
api  frontend
root@vps-15408671:/var/www/sistema-rh# ls
api  frontend
root@vps-15408671:/var/www/sistema-rh# sudo apt update
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
Hit:1 http://br.archive.ubuntu.com/ubuntu jammy InRelease                                       
Get:2 http://br.archive.ubuntu.com/ubuntu jammy-updates InRelease [128 kB]                      
Hit:3 https://deb.nodesource.com/node_20.x nodistro InRelease                 
Hit:4 http://security.ubuntu.com/ubuntu jammy-security InRelease              
Hit:5 http://br.archive.ubuntu.com/ubuntu jammy-backports InRelease
Get:6 http://br.archive.ubuntu.com/ubuntu jammy-updates/main amd64 Packages [3,578 kB]
Get:7 http://br.archive.ubuntu.com/ubuntu jammy-updates/universe amd64 Packages [1,276 kB]
Fetched 4,982 kB in 2s (2,150 kB/s)                        
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
5 packages can be upgraded. Run 'apt list --upgradable' to see them.
root@vps-15408671:/var/www/sistema-rh# sudo apt install -y
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
0 upgraded, 0 newly installed, 0 to remove and 5 not upgraded.
root@vps-15408671:/var/www/sistema-rh# sudo apt install -y \ docker-ce \ docker-ce-cli \ containerd.io \ docker-buildx-plugin \ docker-compose-plugin
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
E: Unable to locate package  docker-ce
E: Unable to locate package  docker-ce-cli
E: Unable to locate package  containerd.io
E: Unable to locate package  docker-buildx-plugin
E: Unable to locate package  docker-compose-plugin
root@vps-15408671:/var/www/sistema-rh# sudo apt install -y \
ca-certificates \
curl
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
ca-certificates is already the newest version (20260601~22.04.1).
curl is already the newest version (7.81.0-1ubuntu1.24).
0 upgraded, 0 newly installed, 0 to remove and 5 not upgraded.
root@vps-15408671:/var/www/sistema-rh# sudo apt install -y ca-certificates curl
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
ca-certificates is already the newest version (20260601~22.04.1).
curl is already the newest version (7.81.0-1ubuntu1.24).
0 upgraded, 0 newly installed, 0 to remove and 5 not upgraded.
root@vps-15408671:/var/www/sistema-rh# sudo install -m 0755 -d /etc/apt/keyrings
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
root@vps-15408671:/var/www/sistema-rh# sudo apt install -y ca-certificates curl
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
ca-certificates is already the newest version (20260601~22.04.1).
curl is already the newest version (7.81.0-1ubuntu1.24).
0 upgraded, 0 newly installed, 0 to remove and 5 not upgraded.
root@vps-15408671:/var/www/sistema-rh# sudo install -m 0755 -d /etc/apt/keyrings
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
root@vps-15408671:/var/www/sistema-rh# curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo: unable to resolve host vps-15408671.143.95.213.195: Name or service not known
root@vps-15408671:/var/www/sistema-rh# cd ..
root@vps-15408671:/var/www# ls
html  portal-noticias  sistema-chamados  sistema-ibope  sistema-rh
root@vps-15408671:/var/www# cd /var/www/sistema-rh
root@vps-15408671:/var/www/sistema-rh# nano .env
root@vps-15408671:/var/www/sistema-rh# docker compose up -d --build
Command 'docker' not found, but can be installed with:
snap install docker         # version 29.3.1, or
apt  install docker.io      # version 29.1.3-0ubuntu3~22.04.2
apt  install podman-docker  # version 3.4.4+ds1-1ubuntu1.22.04.3
See 'snap info docker' for additional versions.
root@vps-15408671:/var/www/sistema-rh# apt update
Hit:1 http://br.archive.ubuntu.com/ubuntu jammy InRelease                                       
Hit:2 http://br.archive.ubuntu.com/ubuntu jammy-updates InRelease                               
Hit:3 http://security.ubuntu.com/ubuntu jammy-security InRelease    
Hit:4 http://br.archive.ubuntu.com/ubuntu jammy-backports InRelease 
Hit:5 https://deb.nodesource.com/node_20.x nodistro InRelease
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
5 packages can be upgraded. Run 'apt list --upgradable' to see them.
root@vps-15408671:/var/www/sistema-rh# apt install -y docker.io docker-compose-plugin
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
E: Unable to locate package docker-compose-plugin
root@vps-15408671:/var/www/sistema-rh# apt install -y docker.io docker-compose
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following additional packages will be installed:
  bridge-utils containerd dns-root-data dnsmasq-base pigz python3-dockerpty python3-docopt python3-dotenv python3-texttable runc ubuntu-fan
Suggested packages:
  ifupdown aufs-tools cgroupfs-mount | cgroup-lite debootstrap docker-buildx docker-compose-v2 docker-doc rinse zfs-fuse | zfsutils
The following NEW packages will be installed:
  bridge-utils containerd dns-root-data dnsmasq-base docker-compose docker.io pigz python3-dockerpty python3-docopt python3-dotenv python3-texttable runc ubuntu-fan
0 upgraded, 13 newly installed, 0 to remove and 5 not upgraded.
Need to get 74.1 MB of archives.
After this operation, 280 MB of additional disk space will be used.
Get:1 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 pigz amd64 2.6-1 [63.6 kB]
Get:2 http://br.archive.ubuntu.com/ubuntu jammy/main amd64 bridge-utils amd64 1.7-1ubuntu3 [34.4 kB]
Get:3 http://br.archive.ubuntu.com/ubuntu jammy-updates/main amd64 runc amd64 1.3.4-0ubuntu1~22.04.1 [9,569 kB]
Get:4 http://br.archive.ubuntu.com/ubuntu jammy-updates/main amd64 containerd amd64 2.2.1-0ubuntu1~22.04.1 [28.2 MB]
Get:5 http://br.archive.ubuntu.com/ubuntu jammy-updates/main amd64 dns-root-data all 2024071801~ubuntu0.22.04.1 [6,132 B]
Get:6 http://br.archive.ubuntu.com/ubuntu jammy-updates/main amd64 dnsmasq-base amd64 2.90-0ubuntu0.22.04.3 [374 kB]
Get:7 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 python3-dockerpty all 0.4.1-2 [11.1 kB]
Get:8 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 python3-docopt all 0.6.2-4 [26.9 kB]
Get:9 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 python3-dotenv all 0.19.2-1 [20.5 kB]
Get:10 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 python3-texttable all 1.6.4-1 [11.4 kB]
Get:11 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 docker-compose all 1.29.2-1 [95.8 kB]
Get:12 http://br.archive.ubuntu.com/ubuntu jammy-updates/universe amd64 docker.io amd64 29.1.3-0ubuntu3~22.04.2 [35.7 MB]
Get:13 http://br.archive.ubuntu.com/ubuntu jammy/universe amd64 ubuntu-fan all 0.12.16 [35.2 kB]
Fetched 74.1 MB in 5s (13.8 MB/s)     
Preconfiguring packages ...
Selecting previously unselected package pigz.
(Reading database ... 155575 files and directories currently installed.)
Preparing to unpack .../00-pigz_2.6-1_amd64.deb ...
Unpacking pigz (2.6-1) ...
Selecting previously unselected package bridge-utils.
Preparing to unpack .../01-bridge-utils_1.7-1ubuntu3_amd64.deb ...
Unpacking bridge-utils (1.7-1ubuntu3) ...
Selecting previously unselected package runc.
Preparing to unpack .../02-runc_1.3.4-0ubuntu1~22.04.1_amd64.deb ...
Unpacking runc (1.3.4-0ubuntu1~22.04.1) ...
Selecting previously unselected package containerd.
Preparing to unpack .../03-containerd_2.2.1-0ubuntu1~22.04.1_amd64.deb ...
Unpacking containerd (2.2.1-0ubuntu1~22.04.1) ...
Selecting previously unselected package dns-root-data.
Preparing to unpack .../04-dns-root-data_2024071801~ubuntu0.22.04.1_all.deb ...
Unpacking dns-root-data (2024071801~ubuntu0.22.04.1) ...
Selecting previously unselected package dnsmasq-base.
Preparing to unpack .../05-dnsmasq-base_2.90-0ubuntu0.22.04.3_amd64.deb ...
Unpacking dnsmasq-base (2.90-0ubuntu0.22.04.3) ...
Selecting previously unselected package python3-dockerpty.
Preparing to unpack .../06-python3-dockerpty_0.4.1-2_all.deb ...
Unpacking python3-dockerpty (0.4.1-2) ...
Selecting previously unselected package python3-docopt.
Preparing to unpack .../07-python3-docopt_0.6.2-4_all.deb ...
Unpacking python3-docopt (0.6.2-4) ...
Selecting previously unselected package python3-dotenv.
Preparing to unpack .../08-python3-dotenv_0.19.2-1_all.deb ...
Unpacking python3-dotenv (0.19.2-1) ...
Selecting previously unselected package python3-texttable.
Preparing to unpack .../09-python3-texttable_1.6.4-1_all.deb ...
Unpacking python3-texttable (1.6.4-1) ...
Selecting previously unselected package docker-compose.
Preparing to unpack .../10-docker-compose_1.29.2-1_all.deb ...
Unpacking docker-compose (1.29.2-1) ...
Selecting previously unselected package docker.io.
Preparing to unpack .../11-docker.io_29.1.3-0ubuntu3~22.04.2_amd64.deb ...
Unpacking docker.io (29.1.3-0ubuntu3~22.04.2) ...
Selecting previously unselected package ubuntu-fan.
Preparing to unpack .../12-ubuntu-fan_0.12.16_all.deb ...
Unpacking ubuntu-fan (0.12.16) ...
Setting up python3-dotenv (0.19.2-1) ...
Setting up python3-texttable (1.6.4-1) ...
Setting up python3-docopt (0.6.2-4) ...
Setting up dnsmasq-base (2.90-0ubuntu0.22.04.3) ...
Setting up runc (1.3.4-0ubuntu1~22.04.1) ...
Setting up dns-root-data (2024071801~ubuntu0.22.04.1) ...
Setting up bridge-utils (1.7-1ubuntu3) ...
Setting up pigz (2.6-1) ...
Setting up containerd (2.2.1-0ubuntu1~22.04.1) ...
Created symlink /etc/systemd/system/multi-user.target.wants/containerd.service → /lib/systemd/system/containerd.service.
Setting up python3-dockerpty (0.4.1-2) ...
Setting up ubuntu-fan (0.12.16) ...
Created symlink /etc/systemd/system/multi-user.target.wants/ubuntu-fan.service → /lib/systemd/system/ubuntu-fan.service.
Setting up docker-compose (1.29.2-1) ...
Setting up docker.io (29.1.3-0ubuntu3~22.04.2) ...
Adding group `docker' (GID 120) ...
Done.
Created symlink /etc/systemd/system/multi-user.target.wants/docker.service → /lib/systemd/system/docker.service.
Created symlink /etc/systemd/system/sockets.target.wants/docker.socket → /lib/systemd/system/docker.socket.
Processing triggers for dbus (1.12.20-2ubuntu4.1) ...
Processing triggers for man-db (2.10.2-1) ...
Scanning processes...                                                                                                                                                                                       
Scanning linux images...                                                                                                                                                                                    

Running kernel seems to be up-to-date.

No services need to be restarted.

No containers need to be restarted.

No user sessions are running outdated binaries.

No VM guests are running outdated hypervisor (qemu) binaries on this host.
root@vps-15408671:/var/www/sistema-rh# systemctl enable docker
root@vps-15408671:/var/www/sistema-rh# systemctl start docker
root@vps-15408671:/var/www/sistema-rh# docker --version
Docker version 29.1.3, build 29.1.3-0ubuntu3~22.04.2
root@vps-15408671:/var/www/sistema-rh# docker-compose --version
docker-compose version 1.29.2, build unknown
root@vps-15408671:/var/www/sistema-rh# cd /var/www/sistema-rh
root@vps-15408671:/var/www/sistema-rh# docker-compose up -d --build
Creating network "sistema_rh_net" with the default driver
Creating volume "sistema-rh_sistema_rh_pgdata" with default driver
Pulling postgres (postgres:16-alpine)...
16-alpine: Pulling from library/postgres
d84bc3f3ded6: Pull complete
55afa1ecc21d: Pull complete
6c2eaa02a04a: Pull complete
0d4fedf9cad8: Pull complete
f7f6aac6fe13: Pull complete
f2511ae13411: Pull complete
f63c7a8df82b: Pull complete
ecbe26720671: Pull complete
ddab922e8d89: Pull complete
95e4c51fed83: Pull complete
5de95df2a1fb: Pull complete
bf118c795fb8: Download complete
c2fa7d9e1146: Download complete
Digest: sha256:e013e867e712fec275706a6c51c966f0bb0c93cfa8f51000f85a15f9865a28cb
Status: Downloaded newer image for postgres:16-alpine
Building api
DEPRECATED: The legacy builder is deprecated and will be removed in a future release.
            Install the buildx component to build images with BuildKit:
            https://docs.docker.com/go/buildx/

Sending build context to Docker daemon  197.1kB
Step 1/11 : FROM node:20-alpine
20-alpine: Pulling from library/node
fff4e2c1b189: Pulling fs layer
6a0ac1617861: Pulling fs layer
4feea04c1543: Pulling fs layer
b2cbbfe903b0: Pulling fs layer
14f8540414db: Download complete
0f92261bcd1c: Download complete
fff4e2c1b189: Download complete
b2cbbfe903b0: Download complete
6a0ac1617861: Download complete
6a0ac1617861: Pull complete
4feea04c1543: Download complete
b2cbbfe903b0: Pull complete
4feea04c1543: Pull complete
fff4e2c1b189: Pull complete
Digest: sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
Status: Downloaded newer image for node:20-alpine
 ---> fb4cd12c85ee
Step 2/11 : WORKDIR /app
 ---> Running in 2c852b5d6c4a
 ---> Removed intermediate container 2c852b5d6c4a
 ---> 44c64e7246a4
Step 3/11 : COPY package*.json ./
 ---> 941cb1527b09
Step 4/11 : RUN npm ci
 ---> Running in 45a96dc8afed
npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
npm warn deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated fstream@1.0.12: This package is no longer supported.

added 223 packages, and audited 224 packages in 11s

22 packages are looking for funding
  run `npm fund` for details

6 vulnerabilities (2 low, 2 moderate, 2 high)

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
npm notice
npm notice New major version of npm available! 10.8.2 -> 11.17.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.17.0
npm notice To update run: npm install -g npm@11.17.0
npm notice
 ---> Removed intermediate container 45a96dc8afed
 ---> d887a1e059a1
Step 5/11 : COPY prisma ./prisma
 ---> ca3f283dcf45
Step 6/11 : RUN npx prisma generate
 ---> Running in 359a34e778d3
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.10.1) to ./node_modules/@prisma/client in 160ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate

 ---> Removed intermediate container 359a34e778d3
 ---> 776f8702b2e0
Step 7/11 : COPY tsconfig.json ./
 ---> 7fa1f8d9d56b
Step 8/11 : COPY src ./src
 ---> eac0218934ff
Step 9/11 : RUN npm run build
 ---> Running in e11784c8c7a0

> sistema-rh-backend@1.0.0 build
> tsc

 ---> Removed intermediate container e11784c8c7a0
 ---> cef0231c1b7f
Step 10/11 : EXPOSE 3333
 ---> Running in 76c96f1467fc
 ---> Removed intermediate container 76c96f1467fc
 ---> 30778f4ce096
Step 11/11 : CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
 ---> Running in c9cbf5528aff
 ---> Removed intermediate container c9cbf5528aff
 ---> 0431dd294ad5
Successfully built 0431dd294ad5
Successfully tagged sistema-rh_api:latest
Creating sistema-rh-postgres ... done
Creating sistema-rh-api      ... done
root@vps-15408671:/var/www/sistema-rh# nano /etc/nginx/sites-available/default
root@vps-15408671:/var/www/sistema-rh# 
root@vps-15408671:/var/www/sistema-rh# nano /etc/nginx/sites-available/portal88.com.br
root@vps-15408671:/var/www/sistema-rh# nano /etc/nginx/sites-available/default
root@vps-15408671:/var/www/sistema-rh# nginx -t
nginx: [emerg] "location" directive is not allowed here in /etc/nginx/sites-enabled/default:101
nginx: configuration file /etc/nginx/nginx.conf test failed
root@vps-15408671:/var/www/sistema-rh# nano /etc/nginx/sites-available/default
root@vps-15408671:/var/www/sistema-rh# nginx -t
nginx: [emerg] "location" directive is not allowed here in /etc/nginx/sites-enabled/default:101
nginx: configuration file /etc/nginx/nginx.conf test failed
root@vps-15408671:/var/www/sistema-rh# nano /etc/nginx/sites-available/default

  GNU nano 6.2                                                                         /etc/nginx/sites-available/default                                                                                   
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin $cors_origin always;
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT,PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,User-Agent,X-Requested-With" always;
        add_header Access-Control-Max-Age 1728000 always;
        add_header Content-Length 0;
        return 204;
    }

    add_header Access-Control-Allow-Origin $cors_origin always;
    add_header Access-Control-Allow-Credentials true always;
    add_header Vary Origin always;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
}
# ROTA INTEGRADA: API IBOPE (Porta 3001)
location /sistema-rh-api/ {
    proxy_pass http://127.0.0.1:3334/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /sistema-rh/ {
    alias /var/www/sistema-rh/frontend/;
    index index.html;
    try_files $uri $uri/ /sistema-rh/index.html;
}
}

# 3. BLOCO DE REDIRECIONAMENTO (Força HTTP virar HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name portal88.com.br;

    if ($host = portal88.com.br) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    return 404; # managed by Certbot
}

