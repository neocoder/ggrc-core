/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

const tag = 'issue-tracker-switcher';

export default GGRC.Components('issueTrackerSwitcher', {
  tag: tag,
  template: '<content/>',
  viewModel: {
    define: {
      isIntegrationEnabled: {
        set: function (newValue, setValue) {
          // convert to bool type. dropdown returns "true" or "false" as string
          const enabled = this.convertToBool(newValue);
          if ( enabled ) {
            this.attr('instance').initIssueTrackerForAssessment();
          }
          setValue(enabled);
        },
      },
      defaultTitle: {
        set: function (newValue, setValue) {
          if (newValue &&
              this.attr('setIssueTitle') &&
              this.attr('instance').isNew()) {
            this.setDefaultIssueTitle(newValue);
          }

          setValue(newValue);
        },
      },
      isParent: {
        get: function () {
          return !this.attr('parent');
        },
      },
    },
    instance: {},
    parent: null,
    setIssueTitle: false,
    convertToBool: function (value) {
      if (typeof value === 'boolean') {
        return value;
      }

      return !(!value || value === 'false');
    },
    inlineDropdownValueChange: function (args) {
      let dropdownValue = this.convertToBool(args.value);
      args.value = dropdownValue;
      args.type = 'issueTrackerSwitcherChanged';

      if (dropdownValue) {
        this.attr('instance').initIssueTrackerForAssessment();
      }

      this.dispatch(args);
    },
    setDefaultIssueTitle: function (value) {
      let issueTracker = this.attr('instance.issue_tracker');

      // set from instance title
      if (issueTracker) {
        issueTracker.attr('title', value);
      }
    },
  },
});
