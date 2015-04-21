# Flaggr - Not ready for production yet....

![](https://nodei.co/npm/flaggr.png?downloads=true)

![Flagger](https://cloud.githubusercontent.com/assets/470852/7263785/941e2804-e839-11e4-9e46-e193117c760c.png)

## Methods

### Boolean

```javascript
flaggr.enable(feature, next)
```
```javascript
flaggr.disable(feature, next)
```
```javascript
flaggr.isEnabled(feature, next)
```

### Groups

```javascript
 // Values will be called on members using https://lodash.com/docs#get.
 // If key is a function when called checking for enabled or not it will be called with no arguments
flaggr.registerGroup (feature, groupName, key, value, next)
```
```javascript
flaggr.enableGroup(feature, groupName, next)
```
```javascript
flaggr.disableGroup(feature, groupName, next)
```
```javascript
flaggr.isEnabled(feature, opts, next) // option should be { group: groupName, groupMember }
```
```javascript
flaggr.isEnabledForUser(feature, groupName, groupMember, next)
```

#### Actor. Must respond to id
```javascript
flaggr.enableUser(feature, user, next)
```
```javascript
flaggr.disableUser(feature, user, next)
```
```javascript
flaggr.isEnabled(feature, opts, next) // option should be { user: user }
```
```javascript
flaggr.isEnabledForUser(feature, user, next)
```
## Adapters

- Memory (testing moslty)

## Coming Soon

**Better documentation**

- Flaggr-UI

#### Percentage User
```javascript
flaggr.enablePercentageActors(feature, percentage, next)
```
```javascript
flaggr.disablePercentageActors(feature, next)
```
```javascript
flaggr.isEnabled(feature, opts, next) // option should be { percentageUser: user}
```
#### Percentage Time
```javascript
flaggr.enablePercentageTime(feature, percentage, next)
```
```javascript
flaggr.disablePercentageTime(feature, next)
```
```javascript
flaggr.isEnabled(feature, opts, next) //options should be { percentageTime: time}
```
## Adapters

- Redis