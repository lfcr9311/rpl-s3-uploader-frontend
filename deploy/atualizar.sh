#!/usr/bin/env bash
# =============================================================================
# Atualiza o servidor com o que esta no GitHub e reinicia o container.
#
# Chamado pelo GitHub Actions (.github/workflows/deploy.yml) a cada push na
# main. Tambem pode rodar a mao, no servidor:
#     bash ~/rpl-s3-uploader-frontend/deploy/atualizar.sh
# =============================================================================
# Tudo dentro de { }: o bash le o script inteiro antes de rodar, porque o
# git reset abaixo pode trocar este proprio arquivo no meio da execucao.
{
set -euo pipefail

passo() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
falha() { printf '\n\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

DIR="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
cd "$DIR"

passo "Baixando a $BRANCH do GitHub"
git fetch --quiet origin "$BRANCH"
git reset --quiet --hard "origin/$BRANCH"
git log -1 --format='    commit %h: %s (%an, %ar)'

passo "Reconstruindo e reiniciando o container"
docker network inspect fortran_default >/dev/null 2>&1 \
    || falha "A rede fortran_default nao existe: o ~/fortran (Caddy da porta 80) precisa estar no ar"
docker compose up -d --build --remove-orphans
docker image prune -f --filter label=app=rpl >/dev/null

passo "Conferindo se a tela responde"
ok=0
for _ in $(seq 1 30); do
    if docker compose exec -T rpl-frontend wget -q -O /dev/null http://127.0.0.1/rpl/ 2>/dev/null; then
        ok=1
        break
    fi
    sleep 2
done
if [ "$ok" = 1 ]; then
    printf '    \033[32mOK\033[0m a tela respondeu em /rpl/\n'
else
    docker compose logs --tail 40 rpl-frontend; falha "A tela nao respondeu depois do deploy"
fi
exit 0
}
