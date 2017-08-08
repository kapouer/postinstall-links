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
    "jquery": "^3",
    "flickity": "^2"
  },
  links: {
    "jquery/dist/jquery.slim.min.js": "public/",
    "jquery/dist/jquery.js": "public/jquery.dev.js",
    "flickity/dist/*": "public/flickity/"
  }

```

* the first component of a link source path is the module name, it is replaced
by the resolved path of the module directory.

* the link source path can end with a (glob-compatible) wildcard, in which case
all matched files are symlinked. In this case the destination path must end with
a slash.

