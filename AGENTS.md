# AGENTS.md

## Propósito

Este archivo contiene las instrucciones para agentes de programación que trabajan en `route-forge`. Léelo antes de modificar el repositorio.

Si en el futuro se agrega otro `AGENTS.md` dentro de una carpeta, sus reglas aplican a esa carpeta y prevalecen sobre las generales cuando existe un conflicto.

## Qué es este proyecto

`route-forge` es un monorepo privado escrito en TypeScript, gestionado con pnpm y orquestado con Turborepo. Su objetivo es facilitar la construcción de endpoints de Next.js App Router mediante un pipeline común de petición, validación, middleware, lógica de negocio y respuesta.

El paquete principal es `@dannyjgg/route-forge`. El flujo principal es:

```text
Request -> parseo del body -> validación -> middleware -> servicio -> Response JSON
```

`route-forge` no crea ni intercepta rutas. Cada handler de `app/api/**/route.ts` llama explícitamente a `handleRequest`.

## Estructura

```text
route-forge/
├── apps/
│   └── test-app/                 # App Next estable para E2E de API
├── packages/
│   └── route-forge/              # Biblioteca @dannyjgg/route-forge
│       ├── helpers/
│       │   ├── exceptions.ts
│       │   └── validate.ts
│       ├── interfaces/
│       │   └── index.ts
│       ├── skills/route-forge/   # Skill portable para agentes
│       ├── scripts/              # Validación del tarball npm
│       ├── tests/                # Pruebas unitarias Vitest
│       ├── handle-request.ts
│       ├── index.ts
│       ├── vitest.config.mts
│       ├── LICENSE
│       ├── package.json
│       ├── tsconfig.build.json
│       ├── tsconfig.json
│       └── README.md
├── tests/
│   └── e2e/                      # Pruebas E2E de API con Playwright
├── .github/workflows/            # CI y publicación por tag
├── playwright.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── turbo.json
```

`pnpm-workspace.yaml` incluye `apps/*` y `packages/*`. No crees aplicaciones o paquetes adicionales salvo que se solicite explícitamente.

## Contrato de la biblioteca

`handleRequest` recibe un `Request` compatible con Next.js y expone opciones para:

- Parsear cuerpos JSON o `FormData`.
- Resolver `params` de rutas dinámicas, incluyendo promesas.
- Validar body, query params y params con Zod.
- Ejecutar middlewares en orden y acumular su resultado.
- Ejecutar una función de servicio con el contexto procesado.
- Devolver una `Response` JSON con el código HTTP configurado.

`ExtendsRequest` extiende el `Request` estándar en lugar de depender de la clase interna de una versión concreta de Next.js. Esto permite probar compatibilidad entre Next 14 y la versión estable actual.

Los servicios deben retornar datos, no una `Response`. `handleRequest` serializa la respuesta. Los errores `HttpError` se traducen a respuestas controladas; cualquier otro error se registra y se convierte en un `500` genérico.

`packages/route-forge/index.ts` es la fuente de la API pública y `dist/index.js` es el artefacto publicado. Mantén sincronizados el código, sus tipos, el README y las pruebas al cambiar exports o comportamiento.

## Estrategia de pruebas

- **Vitest:** unitarias e integración directa de `handleRequest`, Zod, FormData, params, middlewares, respuestas y excepciones.
- **Next 14:** el dev dependency del paquete mantiene el chequeo de tipos de la versión mínima soportada.
- **Next estable:** `apps/test-app` compila y ejecuta el artefacto ESM de `dist` mediante `workspace:*`.
- **Playwright:** realiza E2E de API con `request`; no requiere navegador ni viewport.
- **Coverage:** Vitest genera reportes V8 HTML y LCOV sin umbral obligatorio.

No agregues lógica exclusiva para satisfacer una prueba. Las rutas de `apps/test-app` existen para validar la integración pública del paquete.

## Stack y restricciones

- Node.js `>=24` para desarrollo; el paquete publicado admite Node.js `>=18.17.0`.
- pnpm `11.25.0`.
- TypeScript estricto.
- Next.js `>=14` se usa solo como dev dependency para pruebas de compatibilidad; el paquete no lo exige en runtime.
- Zod 4 para validación.
- Turborepo para tareas del workspace.
- Vitest 5 para unitarias.
- Playwright para E2E de API.

Usa únicamente pnpm. No introduzcas lockfiles de npm, Yarn o Bun. Ejecuta `pnpm install` después de cambiar dependencias y no edites `pnpm-lock.yaml` manualmente.

No modifiques ni agregues archivos dentro de `node_modules/`, `dist/`, `.next/`, `.turbo/`, `coverage/`, `playwright-report/` o cualquier carpeta generada. No copies `node_modules` entre repositorios.

Mantén los cambios pequeños y enfocados. Evita `any`, refactors generales, cambios de API o dependencias innecesarias. Conserva los nombres de errores y respuestas existentes y no muestres secretos.

No hagas commits, pushes ni despliegues salvo que el usuario los solicite explícitamente.

## Comandos habituales

Instala o actualiza dependencias:

```bash
pnpm install
```

Ejecuta las pruebas unitarias:

```bash
pnpm test
```

Ejecuta unitarias con coverage:

```bash
pnpm test:coverage
```

Ejecuta los tipos de todo el workspace:

```bash
pnpm check-types
```

Compila el workspace y genera el artefacto publicable:

```bash
pnpm build
```

Valida metadata, tipos y contenido del tarball npm:

```bash
pnpm --filter @dannyjgg/route-forge package:check
```

Compila la app y ejecuta E2E:

```bash
pnpm test:e2e
```

Ejecuta la validación completa:

```bash
pnpm test:all
```

Aplica Prettier:

```bash
pnpm format
```

Cuando sea posible, limita el formateo a los archivos modificados para evitar cambios ajenos.

## Publicación npm

El paquete público se llama `@dannyjgg/route-forge`. GitHub Actions prepara una versión en staging cuando se crea un tag cuyo nombre coincide exactamente con `v` y la versión de `packages/route-forge/package.json`.

Antes de cada release:

1. Configura el secret stage-only `NPM_TOKEN_V` en GitHub.
2. Confirma que el tag pendiente no exista en GitHub ni en npm.
3. Ejecuta `pnpm test:all` y `pnpm --filter @dannyjgg/route-forge package:check`.
4. Crea el tag `v<version>` solamente cuando el usuario lo solicite.

El workflow ejecuta coverage, E2E, `publint`, `attw`, validación del tarball y staging con provenance. Un maintainer debe aprobar cada staging con `npm stage approve <stage-id>` y 2FA. No publiques si una versión equivalente ya existe en npm.

## Flujo de trabajo recomendado

1. Lee el contexto, los archivos afectados y las pruebas existentes antes de editar.
2. Mantén los imports, exports y tipos coherentes con la estructura existente.
3. Añade o ajusta pruebas unitarias al cambiar el pipeline.
4. Añade o ajusta E2E al cambiar el contrato de integración con Next.js.
5. Actualiza `pnpm-lock.yaml` mediante `pnpm install` si cambian dependencias.
6. Ejecuta `pnpm check-types`, las pruebas relevantes y `pnpm test:e2e` cuando cambie la integración.
7. Ejecuta `pnpm lint` cuando exista una tarea de lint. Actualmente los paquetes no declaran una.
8. Revisa `git diff` y `git status` para confirmar que solo se modificaron archivos intencionales.

## Criterio de finalización

Una modificación está completa cuando:

- Mantiene el comportamiento y los exports públicos salvo que el cambio sea explícito.
- Pasa `pnpm check-types`.
- Pasa las pruebas unitarias relacionadas.
- Pasa `pnpm test:e2e` cuando cambia la integración con Next.js.
- Pasa `pnpm --filter @dannyjgg/route-forge package:check` cuando cambia metadata, exports o build publicable.
- No contiene dependencias o artefactos generados manualmente.
- La documentación relevante permanece sincronizada con el código.
