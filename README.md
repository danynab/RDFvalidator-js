# RDFvalidator-js
RDF Validator that uses JSON as Domain-Specific Language to define constraints.

An example of file with contraints which they are called definitions is the next.

```
{
  "prefixes": {
    "foaf": "http://xmlns.com/foaf/0.1/",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "definitions": [{
    "name": "user",
    "type": "foaf:Person",
    "rules": {
      "foaf:name": {
        "type": "xsd:string"
      },
      "foaf:age": {
        "type": "xsd:integer",
        "maxOccurs": 1,
        "minOccurs": 0,
        "regex": "^[1-9][0-9]*$"
      }
    }
  }, {
    "name": "client",
    "rules": {
      "foaf:name": {
        "type": "xsd:string"
      }
    }
  }]
}
```
In the next table you can see the propierties that a definition can have.

| Property | Description                                                     |
| -------- | --------------------------------------------------------------- |
| name     | The name of the definition. This property is required.          |
| type     | The type of the definition. This property is optional.          |
| rules    | Set of constraints that properties of the resource must comply. |

In the next table you can see the properties of each rules. A set of rules determines the constratins that the a RDF resource has to comply to be validated.

| Property  | Description                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| type      | The type of value the property of resource can have. It must be defined with the correspondent prefix, ej: xsd:string. This property is required. |
| minOccurs | The minimum number of property’s occurrences. This property is optional. Its default value is 1.                                                  |
| maxOccurs | The maximum number of property’s occurrences. This property is optional. If it is not set, there is not a maximum number of occurrences.          |
| regex     | A regular expression that value of the property must comply. This property is optional.                                                           |

A example of RDF file written using Turtle Syntax is the next.
```
@prefix : <http://example.org/>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.

:Bob
  rdf:type foaf:Person ;
  foaf:name "Bob Smith" ;
  foaf:age 32 .

:Thompson.J
  a foaf:Person ;
  foaf:name "Joe Thompson", "J.T." ;
  foaf:age 21 .

:Maria
  foaf:name "Maria Fernandez" .
```

##  INSTALL
To use this validator install [Node.js](https://nodejs.org) is necessary. 

After that you must clone the repository:
```bash
git clone https://github.com/danynab/RDFvalidator-js.git
cd RDFvalidator-js
```

Install dependencies:
```bash
npm install
```

Run the validator with a ttl file and a JSON file.
```bash
node validator.js rdf-data.ttl definitions.json
```

## Samples
In the folder [Samples](./samples)
 there are a few samples to test the validator.
