# Route Forge

Route Forge es una biblioteca TypeScript para facilitar endpoints de Next.js App Router. Envuelve cada handler en un pipeline común de parseo, validación, middleware, servicio y respuesta JSON.

## Características

- Parseo de JSON y `FormData`.
- Validación de body, query params y params con Zod 4.
- Middlewares secuenciales con datos acumulados.
- Params dinámicos como objeto o `Promise`.
- Excepciones HTTP tipadas.
- Respuestas de error controladas y fallback `500`.
- ESM-only con declaraciones TypeScript.
- Compatibilidad con Next.js 14 y versiones actuales.
- Skill portable para agentes compatibles con Agent Skills.

## Instalación del paquete

```bash
pnpm add @dannyjgg/route-forge zod
```

```bash
npm install @dannyjgg/route-forge zod
```

La aplicación consumidora debe tener Next.js 14 o superior.

## Skill para agentes

```bash
npx skills add asmel2020/route-forge --skill route-forge
```

El skill se distribuye también dentro del paquete npm y documenta el flujo completo, la API, errores, FormData, middleware, params dinámicos y una plantilla de ruta.

## Uso básico

```ts
import { handleRequest } from "@dannyjgg/route-forge";
import type { NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export async function POST(request: NextRequest) {
  return handleRequest({
    request,
    validate: bodySchema,
    services: ({ context }) => ({
      message: `Usuario ${context.body.name} creado`,
      email: context.body.email,
    }),
    codeResponse: 201,
  });
}
```

## Estructura

```text
apps/test-app/                   App Next para E2E de API
packages/route-forge/            Biblioteca, skill y unitarias
tests/e2e/                       Pruebas E2E con Playwright
.github/workflows/               CI y publicación por tag
```

## Desarrollo

Requiere Node.js 24 o superior y pnpm 11.25.0. El paquete publicado admite Node.js 18.17 o superior.

```bash
pnpm install
pnpm build
```

## Comandos

| Comando                                             | Descripción                                            |
| --------------------------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                                          | Inicia las tareas persistentes del workspace           |
| `pnpm build`                                        | Compila las apps y el paquete ESM                      |
| `pnpm check-types`                                  | Comprueba los tipos de todo el workspace               |
| `pnpm test`                                         | Ejecuta las pruebas unitarias                          |
| `pnpm test:coverage`                                | Genera coverage V8 sin umbral obligatorio              |
| `pnpm test:e2e`                                     | Compila la app y ejecuta Playwright                    |
| `pnpm test:all`                                     | Ejecuta unitarias, tipos y E2E                         |
| `pnpm --filter @dannyjgg/route-forge package:check` | Valida metadata, tipos, tamaño y contenido del tarball |
| `pnpm format:check`                                 | Comprueba el formato sin escribir archivos             |
| `pnpm format`                                       | Formatea el repositorio con Prettier                   |

## Estrategia de pruebas

- La librería se prueba con Vitest usando `NextRequest` de Next 14.
- `apps/test-app` usa la versión estable actual de Next.js y consume el artefacto ESM de `dist` mediante `workspace:*`.
- Playwright ejecuta siete casos E2E de API sin descargar navegadores.
- `publint` y `attw` validan metadata, exports y declaraciones.
- El tarball solo puede contener `dist`, README, licencia, el skill y metadata.

## Publicación

El workflow de publicación se activa con un tag `vX.Y.Z` que coincida exactamente con la versión del paquete. Requiere el secret `NPM_TOKEN_V` y publica con provenance.

La documentación completa de la API está en [`packages/route-forge/README.md`](packages/route-forge/README.md).
