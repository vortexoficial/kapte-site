#  Kapte Mídia - Site Institucional

Site institucional completo com design moderno, responsivo e animações fluidas.

---

##  Seção Instagram Reels

### Como atualizar os links dos Reels:

1. Abra o arquivo `index.html`
2. Localize a seção `<!-- INSTAGRAM REELS CAROUSEL -->`
3. Substitua os links de exemplo:

```html
<!-- DE: -->
<a href="https://www.instagram.com/reel/EXEMPLO1" ...>

<!-- PARA: -->
<a href="https://www.instagram.com/reel/SEU_LINK_REAL" ...>
```

### Como substituir as thumbnails (miniaturas):

1. Coloque suas imagens na pasta `assets/images/`
2. Nomeie-as como: `reel-thumb-1.jpg`, `reel-thumb-2.jpg`, etc.
3. **Dimensões ideais:** 220px a 390px (9:16 - formato vertical)

**Formatos aceitos:** JPG, PNG, SVG, WebP

---

## ? Animações Implementadas

### Animações de Entrada (On Scroll):
- **Fade In Up** no Hero
- **Fade In** nas seções conforme você rola a página
- **Scale In** nos cards ao passar o mouse

### Micro-Interações:
- Botões com efeito de brilho interno
- Cards com reflexo animado ao hover
- Menu com underline animado
- Logo com pulsação sutil

### Carrossel Infinito:
- **Movimento contínuo** automático (40s por ciclo)
- **Pausa no hover** para desktop
- **Indicador de progresso** sutil no topo
- **Efeito fade** nas bordas laterais

---

##  Personalizações Rápidas

### Alterar velocidade do carrossel:

No arquivo `css/style.css`, linha ~965:

```css
animation: scrollInfinite 40s linear infinite;
/* Altere 40s para o tempo desejado (menor = mais rápido) */
```

### Alterar o link do Instagram principal:

No arquivo `index.html`, localize:

```html
<a href="https://www.instagram.com/kaptemidia" ...>
```

---

##  Responsividade

- **Desktop:** > 1200px
- **Tablet:** 768px - 1199px
- **Mobile:** < 768px

Todos os elementos foram otimizados para mobile com:
- Touch targets de 48px+
- Inputs de 52px de altura
- Fontes legíveis (16px mínimo)
- Carrossel adaptado para telas pequenas

---

##  Como visualizar

1. Abra `index.html` no navegador **OU**
2. Use Live Server no VS Code para hot reload

---

##  Chat IA (Groq)

### Modo estático (GitHub Pages) ? 100% no navegador

O chat foi refatorado para funcionar **sem backend**, chamando a Groq direto do browser.

1. Crie um arquivo `env.txt` na raiz do projeto (você pode copiar de `env.example.txt`)
2. Preencha com sua chave:

```txt
GROQ_API_KEY=SUA_CHAVE_AQUI
GROQ_MODEL=llama-3.1-8b-instant
```

3. Publique o site com o `env.txt` junto.

Obs. importante: em hospedagem estática a chave fica **pública** (qualquer pessoa pode inspecionar e copiar). Se você precisa proteger a chave, use um proxy/serverless.

Obs. sobre CORS: o código envia os headers corretos (`Authorization`, `Content-Type`), mas se a API bloquear CORS para chamadas do browser, você vai precisar de um proxy.

### ?Treinar? o chat com conteúdo do site

O servidor já injeta no prompt o texto do site (HTML) + um arquivo de conhecimento.

- Edite: `chat-knowledge.md`
- Para ?incluir os vídeos?, coloque **transcrição ou resumo** l? (o modelo não consegue assistir MP4 diretamente).

---

##  Estrutura de Arquivos

```
kapte-site/
+-- index.html
+-- css/
   +-- style.css          # Estilos principais + animações
   +-- responsive.css     # Media queries (mobile/tablet)
+-- js/
   +-- main.js           # Menu, accordion e scroll animations
+-- assets/
   +-- images/           # Hero background + Reels thumbnails
   +-- icons/            # ícones dos serviços (SVG)
```

---

##  Próximos Passos

1. **Substitua os links** dos Reels pelos reais
2. **Atualize as imagens** dos thumbnails
3. **Personalize os textos** conforme necessário
4. **Integre formulário** com backend (opcional)

---

**Desenvolvido com  para Kapte Mídia**
