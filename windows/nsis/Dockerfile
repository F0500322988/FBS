FROM debian:trixie-slim
RUN --mount=type=secret,id=proxy_ca,required=true \
    apt-get -o Acquire::https::CaInfo=/run/secrets/proxy_ca update && \
    apt-get -o Acquire::https::CaInfo=/run/secrets/proxy_ca install -y --no-install-recommends nsis 7zip ca-certificates && \
    rm -rf /var/lib/apt/lists/* && mkdir -p /home/builder && chown 1000:1000 /home/builder
USER 1000:1000
ENV HOME=/home/builder
WORKDIR /work
