# postinstall-links

Create links to files in dependencies at npm postinstall

## Usage

In package.json:

```

{
  scripts: {
    "postinstall": "postinstall-links"
  },
  dependencies: {
    "postinstall-links": "^1",
    "jquery": "^3"
  },
  links: {
    "jquery/jquery.slim.min.js": "public/",
    "jquery/jquery.js": "public/jquery.dev.js"
  }

```

Note that `require.resolve('jquery')` resolves to `node_modules/jquery/dist/`
so it's not necessary to put `dist/` in the path.

