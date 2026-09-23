# copy-gsin implementation rules

- Rebuild `https://www.szgsin.com/` as a pure static site with HTML, CSS, and browser JavaScript only.
- Do not add React, Vue, a backend, a CMS, a database, authentication, or storage services.
- Preserve the original public URL shapes, including `.html` routes and paginated paths.
- Use only authorized source copy and media from the target website.
- Store source observations under `docs/research/`, screenshots under `docs/design-references/`, and public media under `public/media/`.
- Every shared visual component must have a source-traceable specification before implementation.
- Run `npm run check` after meaningful code changes and `npm run verify` before delivery.
- Validate desktop, tablet, and mobile layouts at 1440px, 768px, and 390px.
