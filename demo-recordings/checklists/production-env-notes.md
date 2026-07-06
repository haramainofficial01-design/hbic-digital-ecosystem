# Production Environment Notes

Do not place real secret values in this file.

## Public Website/Admin Publishing

The real publish workflow needs these values in Vercel or the production host:

```text
ADMIN_SECRET=
REVALIDATION_SECRET=
NEXT_PUBLIC_API_URL=
```

If Firebase is used for production content storage, also set:

```text
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

or a service-account JSON strategy supported by the deployment environment.

## Mobile App

The mobile app should point to the public API:

```text
EXPO_PUBLIC_API_URL=
NEXT_PUBLIC_API_URL=
```

Normal website/app content updates should come from the published content API after these production credentials are connected.

## Do Not Share In Demo

- Vercel tokens.
- Firebase service account private keys.
- Admin secret.
- Database URLs.
- Source code.
- Raw environment files.
