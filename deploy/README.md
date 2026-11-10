# Deploy no EC2 (`/rpl`)

O app responde inteiro sob `/rpl`: tela em `/rpl/`, API em `/rpl/api`. A porta 80 do EC2 é
do Caddy do `~/fortran`, que repassa `/rpl*` para `rpl-frontend:80` pela rede dele
(`fortran_default`), sem mexer no caminho. O Caddy deste container serve a tela e repassa
`/rpl/api/*` para `rpl-backend:8010` (repositório `rpl-s3-uploader-backend`).

A cada push na `main`, `.github/workflows/deploy.yml` confere o build, entra no EC2 por
SSH e roda `deploy/atualizar.sh`: `git pull`, `docker compose up -d --build`, conferência.

## Uma vez no EC2

```bash
git clone https://github.com/lfcr9311/rpl-s3-uploader-frontend.git ~/rpl-s3-uploader-frontend
```

A rota `/rpl` fica em `deploy/Caddyfile` do `~/fortran`. Depois de atualizar o fortran,
o Caddy precisa reler o arquivo:

```bash
cd ~/fortran && docker compose restart caddy
```

## Uma vez no seu computador

Chave só para o deploy, limitada a rodar o `atualizar.sh` deste repositório:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy_rpl_frontend -N "" -C github-actions-deploy-rpl-frontend
echo "command=\"bash ~/rpl-s3-uploader-frontend/deploy/atualizar.sh\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty $(cat ~/.ssh/gh_deploy_rpl_frontend.pub)" \
  | ssh -i ~/CHAVE.pem -o IdentitiesOnly=yes ubuntu@ec2-3-137-219-87.us-east-2.compute.amazonaws.com 'cat >> ~/.ssh/authorized_keys'
```

`-o IdentitiesOnly=yes` garante que o ssh use só a chave indicada. Sem isso, ele pode usar
a chave de deploy de outro projeto, e essa dispara o deploy dele.

## Uma vez no GitHub: secrets

```bash
R=lfcr9311/rpl-s3-uploader-frontend
H=ec2-3-137-219-87.us-east-2.compute.amazonaws.com
gh secret set EC2_HOST -R $R -b "$H"
gh secret set EC2_USER -R $R -b "ubuntu"
gh secret set EC2_SSH_KEY -R $R < ~/.ssh/gh_deploy_rpl_frontend
ssh-keyscan -t ed25519 $H | gh secret set EC2_KNOWN_HOSTS -R $R
```

## Dia a dia

No EC2, em `~/rpl-s3-uploader-frontend`:
- `docker compose logs -f rpl-frontend`: log do Caddy do container
- `bash deploy/atualizar.sh`: o mesmo deploy, rodado à mão
