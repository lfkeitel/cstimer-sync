# csTimer Sync

**NOTE**: csTimer has had session syncing builtin for a while now. When this
extension was first created that wasn't the case. I would recommend you use
the builtin import/export functionality of csTimer instead of this extension
as it will be less-prone to errors and be better supported with future changes.

csTimer Sync is a Chrome extension that will save, sync, and restore data for
the csTimer web application. Data is saved to Chrome Sync and available to any
instance of Chrome where you're signed in.

csTimer Sync syncs all data including all session data and preferences. It
doesn't work automatically. You're in complete control of when to save and
restore data.

## Release Notes

### 0.3.0

- Supports csTimer version 2019.12.21
  - Refactor to use indexedDB instead of LocalStorage

### 0.2.1

- Fix new URL for new csTimer site.
- Supports csTimer version 2015.12.12

### 0.2.0

- Supports csTimer version 2015.8.3
  - Custom number of sessions above 15

### 0.1.2

- Support large session data
  - Fixed a bug where the data was larger than the size limit of an item in
    Chrome Sync Storage

### 0.1.1

- First attempt of fixing large session data bug
  - Obviously it didn't help much

### 0.1.0

- Initial release
