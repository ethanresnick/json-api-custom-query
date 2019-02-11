# json-api-custom-query
A query parser/serializer for the ?filter and ?sort param syntax used by the json-api library

## Syntax
See examples [here](https://github.com/ethanresnick/json-api#filtering).

## Changelog

- 1.1.2
  - Properly serialize very large and very small numbers
  - Disallow `null`, `true`, `false`, and anything that parses as a number as symbol names
  - Allow symbol names that have a leading period but whose leading characters don't parse as number (e.g., `.` or `.abc`)
 
- 1.0.2
  - Small bugfixes, one of which was reverted in 1.1.2.
  
- 1.0.1
  - Bugfix to properly serialize symbol (i.e., field or operator) names containing URI reserved characters
  
- 1.0.0
  - Initial release
