# component-server

## API

### `POST /{type}/@{scope}/{name}@{version}`

Add a web component or library with scope, name and version.

- Type is `component` or `library`
- Version is either `x.y.z` or `latest`
- Component name should be lowercase, have a single dash and have two parts, e.g. `hello-world`.
- Library name starts with a letter, and can have letters, dashes or dots in their name
- Versions can only be published once, unless the version is set to `0.0.0` or `latest`.
