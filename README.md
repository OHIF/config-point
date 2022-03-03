# ConfigPoint
A declarative configuration library, where configuration points can be defined, and then later extended to provide customizations for users.

This project is now based at [OHIF](https://github.com/OHIF/config-point.git) as the primary source rather than as a
a personal project from the wayfarer3130 project, and updates will now come from the OHIF repository.

## Overview
`ConfigPoint` is a library that allows script declarations of configuration values
to be modified on demand in a declarative fashion by dynamically loading addtional
configuration files.

The script declaration can be simple static content, for example:
```
const ModalitiesList = ConfigPoint.register({
  ModalitiesList: [
    {id:'MR', name: 'MR', description: 'Magnetic Resonance'},
    {id:'CT', name: 'CT', description: 'Computed Tomography'},
  ],
});
```

or it can be a combination of functional and declarative elements, for example a ReactJS function could be declared:

```
const DisplayModalities = ConfigPoint.register({
  Modalities: {
    ModalitiesList: [
      {id:'MR', name: 'MR', description: 'Magnetic Resonance', component: props => (<li>MR</li>)},
      {id:'CT', name: 'CT', description: 'Computed Tomography', component: props => (<li>{props.translation['CT']</li>)})},
    ],
    displayList: props => (
      <ol>${ConfigPoint.Modalities.ModalitiesList.forEach(item => component(props))}</ol>
    ),
})
```

The function declarations can only be declared in script declarations, as they are compiled components.  However, there isn't any reason that the over-ride can't inherit existing script declarations by referring to them.

The remaining sections go through the declarative design for ConfigPoint, followed by the JSON5 configuration files, and then how to make specific types of changes in configuration files.


## Dynamic Configuration Loader
There is a dynamic configuration loader that examines the URL parameters and loads all of the named configuration files.  In order to do this reasonably securely, a path prefix is provided for the configuration elements, and only simple names for configuration files are permitted.

A typical use of this might be:
```
  if (window) {
    // Load the default theme settings
    const defaultTheme = 'theme';
    const themeBasePath = '/theme';
    const themeUrlParameter = 'theme';
    await loadSearchConfigPoint(defaultTheme, themeBasePath, themeUrlParameter);
  }
```
where the loadSearchConfigPoint method is called with the default theme, the URL prefix for all themes, and the URL parameter value.  In this case, the default theme is named theme, and is found in a file theme.json5.  The path for that is the relative path /theme, and the parameter on the URL is theme.  

The load function returns a promise when all the themes are loaded.  This is also available as `ConfigPoint.loadPromise`
for use when the themes need to have been loaded before proceeding, but are disconnected from the actual load declaration.

The theme files are JSON5 encoded, the advantages of which are:
* Comments are permitted in JSON5
* Keywords can be used on the left hand side instead of strings, eg  `myValue: 'a value'` 
* Trailing commas are permitted

## Script Declaration of Settings
A declaration of a configurable value is done in straight JavaScript, looking just like a JavaScript file exporting a constant value containing an object.  For example, the following example declares a base configuration value, which will be further customized in the following sections:
```js
import ConfigPoint from 'config-point';

export const {point1, point2} = ConfigPoint.register({
  point1: {
    list: [1,2,{id:'three', value: 3}],
    object: {
      a:'eh', 
      nestedList: [{id: 'objectInList', objectInList: true},['list in list']],
      },
    simple: 5,
    simpleString: 'string',
    xFunc: x => (x+1),
  },

  point2: {
    configBase: {
      unchanged: 'unchanged value',
      replaced: 'base value of replaced',
    },
    replace: 'new replaced value',
  }
})
```

This declares an object point1 that is available for customization, but by default just contains the literal javascript object after the point1 declaration.  THe second declaration uses an alternate form, one that declares
the starting value, plus a set of changes.  This is useful when the configuration might be declared after already having modifications to it, so that the configBase is applied first, and then any modifications are applied after the base configuration is declared.

The modifications allowed are described in the next section.

## Customizing Existing Settings
Basic changes to a data structure are made just by declaraing a new value at a given reference path, for example:
```js
ConfigPoint.register({
  point1: {
    simple: 4,
    object:{
      nestedList: [null,['change to list in list'], 'new value'],
    },
  }
})
```

will change the value point1.simple to 4, but will leave point1.simpleString, xFunc etc alone.
It will also change the second list element nestedList[1][0] to ['change to list in list'].  The nestedList[0]
is unchanged because it doesn't specify a value change, while 'new value' is inserted at the end of the list becasue nestedList[2] was previously not defined.

### Basic configOperation definition
A configOperation is an object which declares an operation name, along with change parameters.  There are two types of operations, immediate and functional.  Immediate operations are executed at the time that the declaration occurs, while functional ones apply a function to generate the desired value at the time it is first requested after any change having been made.  Functional operations MUST not recurse indefinitely into references.  The configOperation declaration looks like:
```js
itemToChange: { configOperation: 'operationName', ...parameters },
```
Every declaration is a configOperation, with the default operation being 'merge'.

### Immediate Operations
Immediate operations affect a given value at the time the value is added/changed, and the ordering is important.  Immediate operations normally need to reference the object to change, and to provide a value to change.  The object key to change is declared either by position or id, and the id can additionally specify 
a key to use.  The position is the simple `object[position]` index position, while the id defaults to
finding `object[X]` where `X===id || X[key]===id`
```js
affectValueAtThree: {configOperation: 'operationName', position: 3, value: 'value to use'},
affectValueHavingIdThree: {configOperation: 'operationName', id: 3, reference: 'referenceValue'},
```
affectValueAtThree changes the value 'affectValueAtThree' by setting the value [3] using the literal 'value to use' as the input to the operation.

affectValueHavingIdThree changes the value having the id 3, and looks up the reference 'referenceValue' to get
any input to the list object.

### Basic Merge
The basic merge behaviour depends on the type of the object being merged into and the type of the object specified as the merge value.
* If the merge value is a primitive, then the merge value being merged into is replaced.
* If the merge value is a function, then the merge value is replaced with a function bound to that location in the destination
* If the destination value is null or undefined, then it is replaced by the new value
* If the destination value is an array, and the merge value is an array, then values are replaced by position, with null value in the replace list being ignored.
* If the destination value is an array, and the merge value is an object, then values are replaced by id key.
* If the destination value is an object, and the merge value is an object, then values are replaced by name

For example, assuming the original configuration above, then the declarations:
```javascript
list: null,
// Results in list being null
list: [null,5,null,4],
// Results in the list [1,5,{...},4]
list: { 
  'three': {extraValue: 'extra'},
   1: 3, }
// Results in the list [3,2,{id:'three', value: 3, extraValue: 'extra'}]
// because the 'three' matches the original item at position 2, and does a merge into it, which adds
// the key extraValue (destination value was null).
// Then, the 1 matches the position 0 because it has a literal value of 1, and replaces it with the value 3.
list: [{configOperation: 'merge', id: 'three', key: 'id', value: {...attrs}}]
// Results in  the list [1,2,{id:'three', value: 3, ...attrs}]
```

The name of the config operation is 'merge', but note in the last example that specifying it literally
changes the interpretation some because it specifies the id and value as full items.

### Delete
A delete operation can be done either by index, or by value name.  Either a single item
or an item within a list can be deleted.
```js
simple: DeleteOp.create(1)
list: [DeleteOp.at(1)]
```
which will delete 'simple' value or the value at position 1 in the list.

### Replace
In addition to the basic replace by value, there is a configOperation replace that replaces a value
at a specified location.  For example:
```js
list: [{configOperation: 'replace', position: 1, value: 5}],
```

### Reference
The immediate operations can referencce another object by using the 'replace' or 'merge' operations
with a reference key, for example:
```js
object: {a: {configOperation: 'replace', reference: 'list'}},
// Replaces object.a with the list value, AT the time this gets run
```
This is an immediate mode replace, and does it at hte time the instruction is located.  See the reference operation for a functional assignment.

### Sorted Lists
Instead of referencing simple list values, the ability to create a sorted list from a set of objects 
is quite useful.  There is a basic capability defined by declaring a list element,
and then matching on the id, as seen above in the merge section
```js
      const srcObject = { three: { value: 3, priority: 1 }, two: { value: 2, priority: 2 }, one: { value: 1, priority: 3 } };
      const configBase = {
        srcObject,
        sortObject: SortOp.createSort('srcObject', 'priority'),
      };
      ... register config
      {
          testConfigPoint2: {
            configBase: CONFIG_NAME,
            srcObject: { srcFour, three: { priority: 4 }, two: { priority: null } }     
```
This will move the item three, add srcFour to the list, and remove item two (priority null).

It is also possible to transform lists inline, directly within a list or any other object, for example:
```js
      const { testConfigPoint, testConfigPoint2 } = ConfigPoint.register({
        testConfigPoint: {
          sortArray: {
            configOperation: 'sort', sortKey: 'priority', valueReference: 'value',
            value: [
              { priority: 5, value: { configOperation: 'sort', value: [3, 2], } },
              { priority: 3, value: [-1, -2] },
            ],
          },
        },
      });
```
from the unit tests creates a sorted list containing two sorted lists.

#### Reference and Transform Objects
It is possible to reference another object within the current context root, or the general ConfigPoint object.
The timing of this is done at the time the config point configuration is generated, so the ordering of adding
extensions is, unfortunately, important.
To reference another part of the same config point, and then transform it with the given transform function, use
the following javascript - this will work in JSON provided the transform isn't present.)  
```js
{ configOperation: 'reference', reference: 'itemSrc', transform: transformFunction },
```

To reference another ConfigPoint, use the syntax below.  Note that the object will be the literal reference object, so
it will be affected by future updates.
```js
{ configOperation: 'reference', source: 'BrainLabellingData' },
```

### Safe Functions
One configOperation that is available is `safe`, which interprets the value of the function as a function
where the variables are those declared in the single parameter.  It is not supposed to be allowed to access
other variables in the environment, meaning that the function is safe to execute.  For example, here are some
safe function examples:
```js
fn1: {configOperation: 'safe', value: 'a+b'}
must(fn1({a:1,b:2})).eql(3)

fn2: {configOperation: 'safe', value: '"max(a,b)="+Math.max(a,b)'}
must(fn2({a:1,b:2})).eql("max(a,b)=2")

fn3: {configOperation: 'safe', value: '`backquote=${a}`}
must(fn3({a:"value"}).eql("backquote=value")
```

Note that things like `window.url="http://otherUrl"` will fail because `parameter.window` isn't provided (unless you include window in the parameters explicitly).

The theme file values are protected, but are not guaranteed to be fully safe, so the configuration values should be treated with some caution.

### Usage API
The actual usage of the API is quite simple, a value is declared based on a
registration request, and then is simply used as a straight/simple value.  This
can occur as a ReactJS props argument, or directly in other code such as service
code.  When used as a props argument, the recommended usage is to get the value
and then default to a declared instance.  For example:
```js
const {MyConfigPoint} = ConfigPoint.register([....]);

const myReactFunction = ({configPoint,...}) => {
  // Set a default value if one isn't provided by the parent application
  configPoint = configPoint || MyConfigPoint;
  // Setup the config point for a child function - note this one is a member
  // value of the parent config point, but it could just as easily have been
  // based on an effect/setting elsewhere.
  const {childConfigPoint} = configPoint;
  // Use the config point to determine values directly
  return (<td style=`width:${configPoint.colWidth}`>
     // And have the config point itself contain the choice of what config point
     // a child should use
     {childConfigPoint.reactFunction({configPoint:childConfigPoint})}
     </td>);
```

A more direct naming declaration works as:
```js
const {MyConfigPoint} = ConfigPoint.register({
  MyConfigPoint: { configBase: { ... base configuration }
     ...extension configuration
  }
});

```

![Config Point Study List Usage](./sequence/ConfigPointStudyListUsage.png)

Note how in the above usage, there isn't anything that is actualy ConfigPoint
api specific - it could have been an arbitrary bag of values provided
to the child element, it just happens to be useful to declare it this way
to allow future extensions.  In fact, if the react function is entirely
ignorant of the config point, but has a set of properties around how it is
displayed, then those values can just directly be applied to the child creation.

### Future
Consider just extracting config point service into it's own library.  There
isn't anything OHIF specific about it, and it would be perfectly possible to
use it for other projects/areas.

Should the config points deliver promises rather than direct values?  That would
allow loading values from settings values, and would allow updates to anyone
listening for a config point when the value had finished loading.

#### Theme and Service Selection Loader
One type of theme implementation could be a theme loader that, on startup
loads a provided set of theme values into the ConfigPoint service.  These can
be simple JSON files, which are deployed with the application, for example,
a dark theme could be provided as /theme/dark.json, while a large font theme
might be provided as /theme/large.json.  Then, the user might specify:
https://myapp?theme=dark,large
and this would display the application in the dark and the large themes.
The system would know it was safe to load because the JSON files were vetted
and provided from, for example:
/public/theme/theme.json
/public/theme/dark.json

If the keyword and path are both specified by the using application, then this
can also be used to select from a service.  For example, service=google
or service=aws might load from the source files /public/service/aws.json, defining
how to connect to the AWS cloud services.

#### Self Documenting Configuration
It is additionally useful to allow the application configuration to self-document
the settings which can be modified.  This should document both the structure
of the values, as well as the permissions/safety of the values.  This can then
be used to validate whether user settings are safe to apply, as well as to guide
the user into what settings are available.

## Memory Layout
TODO

```js
```

## Storage in JSON files
The storage in JSON files is identical to that in the register operation,
except that JSON may not contain function declarations.  To alleviate this,
the reference operation is provided, to allow access to pre-declared functions
from within the JSON.

