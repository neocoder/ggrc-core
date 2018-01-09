/*
 Copyright (C) 2017 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  CA_DD_REQUIRED_DEPS,
  applyChangesToCustomAttributeValue,
}
  from '../../plugins/utils/ca-utils';
import {VALIDATION_ERROR} from '../../events/eventTypes';
import tracker from '../../tracker';
import Permission from '../../permission';

(function (GGRC, can) {
  'use strict';

  GGRC.Components('assessmentLocalCa', {
    tag: 'assessment-local-ca',
    viewModel: {
      instance: null,
      formSavedDeferred: can.Deferred().resolve(),
      fields: [],
      isDirty: false,
      saving: false,
      highlightInvalidFields: false,

      define: {
        editMode: {
          type: 'boolean',
          value: false,
          set: function (newValue) {
            if (newValue === true) {
              this.attr('highlightInvalidFields', false);
            }
            return newValue;
          },
        },
        canEdit: {
          type: 'boolean',
          value: false,
          get: function () {
            return this.attr('editMode') &&
              Permission.is_allowed_for('update', this.attr('instance'));
          },
        },
        evidenceAmount: {
          type: 'number',
          set: function (newValue, setValue) {
            setValue(newValue);
            if (this.attr('relatedItemsLoaded')) {
              this.validateForm();
            }
          },
        },
        relatedItemsLoaded: {
          value: false,
          type: 'boolean',
          set(newValue, setValue) {
            setValue(newValue);
            if (newValue) {
              this.validateForm();
            }
          },
        },
        isEvidenceRequired: {
          get: function () {
            var optionsWithEvidence = this.attr('fields')
              .filter(function (item) {
                return item.attr('type') === 'dropdown';
              })
              .filter(function (item) {
                var requiredOption =
                  item.attr('validationConfig')[item.attr('value')];
                return requiredOption === CA_DD_REQUIRED_DEPS.EVIDENCE ||
                   requiredOption ===
                    CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;
              }).length;
            return optionsWithEvidence > this.attr('evidenceAmount');
          },
        },
      },
      validateForm: function (triggerAttachmentModals = false) {
        let hasValidationErrors = false;
        this.attr('fields')
          .each((field) => {
            this.performValidation({field, triggerAttachmentModals});
            if ( !field.validation.valid ) {
              hasValidationErrors = true;
            }
          });

        if ( this.attr('instance') ) {
          this.attr('instance._hasValidationErrors', hasValidationErrors);
        }

        if ( hasValidationErrors ) {
          this.dispatch(VALIDATION_ERROR);
        }
      },
      performValidation: function ({
        field,
        triggerAttachmentModals = false,
      }) {
        var fieldValid;
        var hasMissingEvidence;
        var hasMissingComment;
        var hasMissingValue;
        var requiresEvidence;
        var requiresComment;
        var value = field.value;
        var valCfg = field.validationConfig;
        var fieldValidationConf = valCfg && valCfg[value];
        var isMandatory = field.validation.mandatory;
        var errorsMap = field.errorsMap || {
          evidence: false,
          comment: false,
        };

        requiresEvidence =
          fieldValidationConf === CA_DD_REQUIRED_DEPS.EVIDENCE ||
          fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;

        requiresComment =
          fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT ||
          fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;

        hasMissingEvidence = requiresEvidence &&
          !!this.attr('isEvidenceRequired');

        hasMissingComment = requiresComment && !!errorsMap.comment;

        if (field.type === 'checkbox') {
          if (value === '1') {
            value = true;
          } else if (value === '0') {
            value = false;
          }

          field.attr({
            validation: {
              show: isMandatory,
              valid: isMandatory ? !hasMissingValue && !!(value) : true,
              hasMissingInfo: false,
            },
          });
        } else if (field.type === 'dropdown') {
          fieldValid = (value) ?
            !(hasMissingEvidence || hasMissingComment || hasMissingValue) :
            !isMandatory && !hasMissingValue;

          field.attr({
            validation: {
              show: isMandatory || !!value,
              valid: fieldValid,
              hasMissingInfo: (hasMissingEvidence || hasMissingComment),
              requiresAttachment: (requiresEvidence || requiresComment),
            },
            errorsMap: {
              evidence: hasMissingEvidence,
              comment: hasMissingComment,
            },
          });

          if (triggerAttachmentModals &&
              (hasMissingEvidence || hasMissingComment)) {
            this.dispatch({
              type: 'validationChanged',
              field: field,
            });
          }
        } else {
          // validation for all other fields
          field.attr({
            validation: {
              show: isMandatory,
              valid: isMandatory ? !hasMissingValue && !!(value) : true,
              hasMissingInfo: false,
            },
          });
        }
      },
      updateEvidenceValidation: function () {
        var isEvidenceRequired = this.attr('isEvidenceRequired');
        this.attr('fields')
          .filter(function (item) {
            return item.attr('type') === 'dropdown';
          })
          .each(function (item) {
            var isCommentRequired;
            if ((item.attr('validationConfig')[item.attr('value')] === 2 ||
                item.attr('validationConfig')[item.attr('value')] === 3)) {
              isCommentRequired = item.attr('errorsMap.comment');
              item.attr('errorsMap.evidence', isEvidenceRequired);
              item.attr('validation.valid',
                !isEvidenceRequired && !isCommentRequired);
            }
          });
      },
      save: function (fieldId, fieldValue) {
        const self = this;
        const changes = {
          [fieldId]: fieldValue,
        };
        const stopFn = tracker.start(this.attr('instance.type'),
          tracker.USER_JOURNEY_KEYS.NAVIGATION,
          tracker.USER_ACTIONS.ASSESSMENT.EDIT_LCA);

        this.attr('isDirty', true);

        this.attr('deferredSave').push(function () {
          var caValues = self.attr('instance.custom_attribute_values');
          applyChangesToCustomAttributeValue(
            caValues,
            new can.Map(changes));

          self.attr('saving', true);
        })
        .done(() => this.attr('formSavedDeferred').resolve())
        // todo: error handling
        .always(() => {
          this.attr('saving', false);
          this.attr('isDirty', false);
          stopFn();
        });
      },
      fieldRequiresComment: function (field) {
        let fieldValidationConf = field.validationConfig[field.value];
          return fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT ||
            fieldValidationConf === CA_DD_REQUIRED_DEPS.COMMENT_AND_EVIDENCE;
      },
      attributeChanged: function (e) {
        e.field.attr('value', e.value);

        // Removes "link" with the comment for DD field and
        // makes it require a new one
        if ( e.field.attr('type') === 'dropdown' &&
            this.fieldRequiresComment(e.field) ) {
          e.field.attr('errorsMap.comment', true);
        }

        this.validateForm(true);
        this.attr('formSavedDeferred', can.Deferred());
        this.save(e.fieldId, e.value);
      },
    },
    events: {
      '{viewModel.instance} afterCommentCreated': function () {
        this.viewModel.validateForm();
      },
      '{viewModel.instance} showInvalidField': function (ev) {
        var pageType = GGRC.page_instance().type;
        var $container = (pageType === 'Assessment') ?
          $('.object-area') : $('.cms_controllers_info_pin');
        var $body = (pageType === 'Assessment') ?
          $('.inner-content.widget-area') : $('.info-pane__body');
        var field;
        var index;

        index = _.findIndex(this.viewModel.attr('fields'), function (field) {
          var validation = field.attr('validation');
          return validation.show && !validation.valid;
        });

        field = $('.field-wrapper')[index];

        if (!field) {
          return;
        }

        this.viewModel.attr('highlightInvalidFields', true);
        $container.animate({
          scrollTop: $(field).offset().top - $body.offset().top,
        }, 500);
      },
    },
    helpers: {
      isInvalidField: function (show, valid, highlightInvalidFields, options) {
        show = Mustache.resolve(show);
        valid = Mustache.resolve(valid);
        highlightInvalidFields = Mustache.resolve(highlightInvalidFields);

        if (highlightInvalidFields && show && !valid) {
          return options.fn(options.context);
        }
        return options.inverse(options.context);
      },
    },
  });
})(window.GGRC, window.can);
