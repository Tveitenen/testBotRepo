# --- Stage 1: Bygg mcp-server fra kilden ---
    FROM golang:1.21 AS mcp-builder

    WORKDIR /src
    # Hent kildekode og bygg binæren
    RUN git clone https://github.com/github/github-mcp-server.git .
    RUN go build -o /mcp/server .
    
    # --- Stage 2: Installer Node og bygg din app ---
    FROM node:18-slim AS app-builder
    
    WORKDIR /app
    # Kopiér kun package-filer for rask install
    COPY package.json package-lock.json tsconfig.json ./
    RUN npm ci
    # Kopiér all TS-kode og bygg
    COPY src ./src
    RUN npm run build
    
    # --- Stage 3: Kjøring med proxy og mcp-server ---
    FROM node:18-slim
    
    WORKDIR /app
    
    # Hent den ferdigbygde mcp-server-binaryen
    COPY --from=mcp-builder /mcp/server /usr/local/bin/server
    
    # Kopiér din bygde app (JavaScript)
    COPY --from=app-builder /app/dist ./dist
    COPY package.json ./
    
    # Installer kun prod-avhengigheter
    RUN npm ci --omit=dev
    
    EXPOSE 3000
    
    # Start proxy (og dermed også STDIO-serveren)
    ENTRYPOINT ["node", "dist/proxy.js"]
    