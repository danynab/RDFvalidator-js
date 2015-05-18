var N3 = require('n3');
var fs = require('fs');
var groupCreator = require('parallel-io');
var sprintf = require("sprintf-js").sprintf;
var colors = require('colors');

var typePrefix = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

var definitions;
var map = {};

var args = process.argv.slice(2);
if (args.length >= 2) {
  doWithFiles(args[0], args[1]);
} else {
  printHelp();
}

function printHelp() {
  console.log('usage:');
  console.log(sprintf('%5s %s', '', 'node validator.js [ttl-file] [definitions-file]'));
  console.log(sprintf('%10s %-20s %s', '-', 'ttl-file:', 'RDF using Turtle syntax'));
  console.log(sprintf('%10s %-20s %s', '-', 'definitions-file:', 'JSON file where the definitions are defined'));
  process.exit(0);
}

function doWithFiles(ttlFile, definitionsFile) {
  var group = groupCreator();

  fs.readFile(ttlFile, 'utf8', group.wrap('rdf', function(err, data) {
    if (err) {
      console.error(('ERROR: ttl-file (' + ttlFile + ') not found').red);
      printHelp();
    }
    return data;
  }));

  fs.readFile(definitionsFile, 'utf8', group.wrap('validator', function(err, data) {
    if (err) {
      console.error(('ERROR: definitions-file (' + definitionsFile + ') not found.').red);
      printHelp();
    }
    try {
      json = JSON.parse(data);
    } catch (err) {
      console.error('ERROR: definitions-file has not a valid format.'.red);
      printHelp();
    }
    var prefixes = json.prefixes;
    var definitions = json.definitions;
    var newDefinitions = [];

    for (var index in definitions) {
      var definition = definitions[index];
      var newDefinition = {
        'name': definition.name
      };
      var rules = definition.rules;
      var definitionType = definition['type'];
      if (definitionType != null) {
        var newDefinitionType = definitionType;
        for (var prefix in prefixes) {
          newDefinitionType = replacePrefix(newDefinitionType, prefix, prefixes[prefix]);
        }
        newDefinition['type'] = newDefinitionType;
        newDefinitionType = null;
      }
      var newRules = {};
      for (var ruleName in rules) {
        var rule = rules[ruleName];
        var newType = rule.type;
        var newRuleName = ruleName;
        if (ruleName == 'a') {
          var newRuleName = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
          newRules[newRuleName] = rule;
        }
        for (var prefix in prefixes) {
          newRuleName = replacePrefix(newRuleName, prefix, prefixes[prefix]);
          newType = replacePrefix(newType, prefix, prefixes[prefix]);
        }
        rule.type = newType;
        newRules[newRuleName] = rule;

      }
      if (newDefinitionType != null) {
        newDefinition['type'] = newDefinitionType;
      }
      newDefinition['rules'] = newRules;
      newDefinitions.push(newDefinition);
    }

    if (newDefinitions.length == 0) {
      console.error('ERROR: definitions-file has not got definitions.'.red);
      printHelp();
    }
    //console.log(JSON.stringify(newDefinitions, null, 2));

    return newDefinitions;
  }));

  group.onAllDone(function(results) {
    var rdf = results['rdf'];
    definitions = results['validator'];
    parseRDF(rdf);
  });
}

function replacePrefix(data, prefix, replacement) {
  var dataSplits = data.split(':');
  if (dataSplits.length > 1) {
    if (dataSplits[0] == prefix) return replacement + dataSplits.slice(1).join(':');
  }
  return data;
}

function parseRDF(rdf) {
  var parser = N3.Parser();
  var N3Util = N3.Util;

  parser.parse(rdf, function(err, triple, prefixes) {
    if (triple) {
      var subject = triple.subject;
      var predicate = triple.predicate;
      var object = triple.object;

      if (map[subject] == null) {
        map[subject] = {}
      }
      var stored = map[subject];
      if (stored[predicate] == null)
        stored[predicate] = {};
      var type;
      var value;
      if (N3Util.isLiteral(object)) {
        type = N3Util.getLiteralType(object);
        value = N3Util.getLiteralValue(object);
      } else if (N3Util.isIRI(object)) {
        type = 'IRI';
        value = object;
      }
      //console.log(subject + ' ' + predicate + ' ' + object);
      //console.log(type + ' ' + value);

      stored[predicate]['type'] = type;
      var oldValue = stored[predicate]['values'];
      if (oldValue == null)
        oldValue = [];
      oldValue.push(value);
      stored[predicate]['values'] = oldValue;

      map[subject] = stored;
    } else {
      inferDefinitions(map);
    }
  })
}

function inferDefinitions(map) {
  var result = [];
  for (subject in map) {
    var definitionsValid = []
    var predicates = map[subject]
    for (var i in definitions) {
      var definition = definitions[i];
      var count = 0;
      var rules = definition.rules;

      var typeValid = true;
      var definitionType = definition['type'];

      // Check type (a) of the node if it is defined.
      if (definitionType != null) {
        var typePredicate = predicates[typePrefix];
        if (typePredicate != null) {
          typeValid = predicates[typePrefix].values[0] == definitionType;
        } else {
          typeValid = false;
        }
      }
      if (typeValid) {
        for (var ruleName in rules) {
          var rule = rules[ruleName];
          var type = rule['type'];
          if (type == null) {
            console.error('ERROR: definitions-file has not a valid format. Type attribute is required.'.red);
            printHelp();
          }
          var minOccurs = rule['minOccurs'];
          if (minOccurs == null) minOccurs = 1;
          var maxOccurs = rule['maxOccurs'];
          var regex = rule['regex'];

          var predicate = predicates[ruleName];

          //Check if predicate with this rule does not exists.
          if (predicate == null) {
            //Check if predicate is optional.
            if (minOccurs == 0) count++;
          } else {
            //Check if predicate type is correct.
            if (predicate['type'] == type) {
              var values = predicate['values'];
              //Check occurrences
              if (values.length >= minOccurs && (maxOccurs == null || values.length <= maxOccurs)) {
                //Check if the values are valid with the regex (if it is defined).
                if (regex != null) {
                  var regExpression = new RegExp(regex);
                  var valid = true;
                  for (var index in values) {
                    valid = valid && regExpression.test(values[index]);
                  }
                  if (valid) count++;
                } else {
                  count++;
                }
              }
            }
          }
        }

        if (count == Object.keys(rules).length)
          definitionsValid.push(definition.name);
      }
    }
    console.log(subject + ': ');
    if (definitionsValid.length == 0) {
      console.log('\tNO DEFINITION');
    } else {
      for (var i in definitionsValid) {
        console.log('\t- ' + definitionsValid[i]);
      }
    }
    result.push({
      "subject": subject,
      "definitions": definitionsValid
    });
  }
}
