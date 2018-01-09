/*
    Copyright (C) 2017 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

/**
 *
 * @event refreshRelated
 * @type {object}
 * @property {string} type - Event name.
 * @property {string} model -  Model name.
 */
const REFRESH_RELATED = {
  type: 'refreshRelated',
};

/**
 *
 * @event saveCustomRole
 * @type {object}
 * @property {string} type - Event name.
 * @property {string} groupId - Role ID.
 */
const SAVE_CUSTOM_ROLE = {
  type: 'saveCustomRole',
};

/**
 *
 * @event rolesConflict
 * @type {object}
 * @property {string} type - Event name.
 * @property {string} groupId - Role ID.
 */
const ROLES_CONFLICT = {
  type: 'rolesConflict',
};

/**
 * Switch to tab with validation error
 * @event switchToErrorPanel
 * @type {object}
 */
const SWITCH_TO_ERROR_PANEL = {
  type: 'switchToErrorPanel',
};

/**
 * Scroll to validation error field and lint it
 * @event showInvalidField
 * @type {object}
 */
const SHOW_INVALID_FIELD = {
  type: 'showInvalidField',
};

/**
 * Set id number of tab with validation error
 * @event validationError
 * @type {object}
 */
const VALIDATION_ERROR = {
  type: 'validationError',
};

/**
 *
 * @event destinationUnmapped
 * @type {object}
 * @property {string} type - Event name.
 */
const DESTINATION_UNMAPPED = {
  type: 'destinationUnmapped',
};

/**
 * Refreshes cached Related Assessments tab
 * @event refreshRelatedAssessments
 * @type {object}
 * @property {string} type - Event name.
 */
const REFRESH_TAB_CONTENT = {
  type: 'refreshTabContent',
};

/**
 * Notifies that related items are loaded
 * @event RELATED_ITEMS_LOADED
 * @type {object}
 * @property {string} type - Event name.
 */
const RELATED_ITEMS_LOADED = {
  type: 'RELATED_ITEMS_LOADED',
};

export {
  REFRESH_RELATED,
  SAVE_CUSTOM_ROLE,
  ROLES_CONFLICT,
  SWITCH_TO_ERROR_PANEL,
  SHOW_INVALID_FIELD,
  VALIDATION_ERROR,
  DESTINATION_UNMAPPED,
  REFRESH_TAB_CONTENT,
  RELATED_ITEMS_LOADED,
};
