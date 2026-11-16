# Uzbek interface spelling

BakeU's Uzbek display translations use the four changes requested by the owner:

| Existing spelling | Display spelling |
| ----------------- | ---------------- |
| ch / Ch / CH      | ç / Ç / Ç        |
| sh / Sh / SH      | ş / Ş / Ş        |
| g‘ / gʻ / gʼ / g' | ğ                |
| o‘ / oʻ / oʼ / o' | ö                |

Uppercase vowels and consonants are retained. Tutuq in words such as `ta’m`
remains unchanged. No additional alphabet changes have been assumed. The owner
mentioned Undov as a reference, but that site's rules have not been verified.

Translation keys, URLs, email addresses, stored records, IDs and user messages
keep their original values. Russian remains available. `ru.json` contains only
nonidentity overrides because the Russian source keys are their own fallback.

When editing authored Uzbek values, apply the same spelling consistently:

```sh
node scripts/update-uzbek-alphabet.mjs
node --test src/i18n/*.test.js
```

The conversion is idempotent and preserves known technical tokens and brand
names. Review its output for language quality rather than applying it to arbitrary
user data. `normalizeSearch` lets users search with either old or new spelling.
