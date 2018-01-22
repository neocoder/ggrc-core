/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

let customAttributesType = {
  Text: 'input',
  'Rich Text': 'text',
  'Map:Person': 'person',
  Date: 'date',
  Input: 'input',
  Checkbox: 'checkbox',
  Dropdown: 'dropdown',
};

let CA_DD_REQUIRED_DEPS = Object.freeze({
  NONE: 0,
  COMMENT: 1,
  EVIDENCE: 2,
  COMMENT_AND_EVIDENCE: 3,
});
let CUSTOM_ATTRIBUTE_TYPE = Object.freeze({
  LOCAL: 1,
  GLOBAL: 2,
});

const CA_DD_FLAGS = {
  COMMENT: 0b001, // 1
  ATTACHMENT: 0b10, // 2
  URL: 0b100, // 4
};


/**
 * Convert DD validation value to validation map
 * @param  {Number} value validation value
 * @return {Object}       validation map
 */
function ddValidationValueToMap(value) {
  return {
    attachment: !!(value & CA_DD_FLAGS.ATTACHMENT),
    comment: !!(value & CA_DD_FLAGS.COMMENT),
    url: !!(value & CA_DD_FLAGS.URL),
  };
}

/**
 * Converts DD validation map to a bitmask number
 * @param  {Object} map A map of values which must be encoded into the bitmask
 * @return {Number}     Bitmask representing the flags map
 */
function ddValidationMapToValue(map = {}) {
  let attach = map.attachment ? CA_DD_FLAGS.ATTACHMENT : 0;
  let comment = map.comment ? CA_DD_FLAGS.COMMENT : 0;
  let url = map.url ? CA_DD_FLAGS.URL : 0;

  return attach | comment | url;
}


/**
 * Util methods for custom attributes.
 */
function sortCustomAttributes(a, b) {
  return a.custom_attribute_id - b.custom_attribute_id;
}

/**
 * Return normalized Custom Attribute Type from Custom Attribute Definition
 * @param {String} type - String Custom Attribute Value from JSON
 * @return {String} - Normalized Custom Attribute Type
 */
function getCustomAttributeType(type) {
  return customAttributesType[type] || 'input';
}

function isEmptyCustomAttribute(value, type, cav) {
  let result = false;
  let types = ['Text', 'Rich Text', 'Date', 'Checkbox', 'Dropdown',
    'Map:Person'];
  let options = {
    Checkbox: function (value) {
      return !value || value === '0';
    },
    'Rich Text': function (value) {
      value = GGRC.Utils.getPlainText(value);
      return _.isEmpty(value);
    },
    'Map:Person': function (value, cav) {
      // Special case, Map:Person has 'Person' value by default
      if (cav) {
        return !cav.attribute_object;
      }
      return _.isEmpty(value);
    },
  };
  if (value === undefined) {
    return true;
  }
  if (types.indexOf(type) > -1 && options[type]) {
    result = options[type](value, cav);
  } else if (types.indexOf(type) > -1) {
    result = _.isEmpty(value);
  }
  return result;
}

/**
 * Converts custom attribute value for UI controls.
 * @param {String} type - Custom attribute type
 * @param {Object} value - Custom attribute value
 * @param {Object} valueObj - Custom attribute object
 * @return {Object} Converted value
 */
function convertFromCaValue(type, value, valueObj) {
  if (type === 'checkbox') {
    return value === '1';
  }

  if (type === 'input') {
    if (!value) {
      return null;
    }
    return value.trim();
  }

  if (type === 'person') {
    if (valueObj) {
      return valueObj.id;
    }
    return null;
  }

  if (type === 'dropdown') {
    if (value === null || value === undefined) {
      return '';
    }
  }
  return value;
}

/**
 * Custom Attributes specific parsing logic to simplify business logic of Custom Attributes
 * @param {Array} definitions - original list of Custom Attributes Definition
 * @param {Array} values - original list of Custom Attributes Values
 * @return {Array} Updated Custom attributes
 */
function prepareCustomAttributes(definitions, values) {
  return definitions.map(function (def) {
    let valueData = false;
    let id = def.id;
    let options = (def.multi_choice_options || '').split(',');
    let optionsRequirements = (def.multi_choice_mandatory || '').split(',');
    let type = getCustomAttributeType(def.attribute_type);
    let stub = {
      id: null,
      custom_attribute_id: id,
      attribute_value: null,
      attribute_object: null,
      validation: {
        empty: true,
        mandatory: def.mandatory,
        valid: true,
      },
      def: def,
      attributeType: type,
      preconditions_failed: [],
      errorsMap: {
        comment: false,
        evidence: false,
        url: false,
      },
    };

    values.forEach(function (value) {
      let errors = [];
      if (value.custom_attribute_id === id) {
        errors = value.preconditions_failed || [];
        value.def = def;
        value.attributeType = type;
        value.validation = {
          empty: errors.indexOf('value') > -1,
          mandatory: def.mandatory,
          valid: errors.indexOf('comment') < 0 &&
          errors.indexOf('evidence') < 0,
        };
        value.errorsMap = {
          comment: errors.indexOf('comment') > -1,
          evidence: errors.indexOf('evidence') > -1,
        };
        valueData = value;
      }
    });

    valueData = valueData || stub;

    if (type === 'dropdown') {
      valueData.validationConfig = {};
      options.forEach(function (item, index) {
        if (optionsRequirements[index]) {
          valueData.validationConfig[item] =
            Number(optionsRequirements[index]);
        }
      });
    }
    return valueData;
  });
}

/**
 * Converts value from UI controls back to CA value.
 * @param {String} type - Custom attribute type
 * @param {Object} value - Control value
 * @return {Object} Converted value
 */
function convertToCaValue(type, value) {
  if (type === 'checkbox') {
    return value ? 1 : 0;
  }

  if (type === 'person') {
    if (value) {
      return 'Person:' + value;
    }
    return 'Person:None';
  }
  return value || null;
}

/**
 * Converts CA values array to form fields.
 * @param {can.List|undefined} customAttributeValues - Custom attributes values
 * @return {Array} From fields array
 */
function convertValuesToFormFields(customAttributeValues) {
  return (customAttributeValues || new can.List([]))
    .map(convertToEditableField);
}

function convertToFormViewField(attr) {
  let options = attr.def.multi_choice_options;
  return {
    type: attr.attributeType,
    id: attr.def.id,
    required: attr.def.mandatory,
    value: convertFromCaValue(
      attr.attributeType,
      attr.attribute_value,
      attr.attribute_object
    ),
    title: attr.def.title,
    placeholder: attr.def.placeholder,
    options: options &&
    typeof options === 'string' ?
      options.split(',') : [],
    helptext: attr.def.helptext,
  };
}

function convertToEditableField(attr) {
  let options = attr.def.multi_choice_options;
  return {
    type: attr.attributeType,
    id: attr.def.id,
    value: convertFromCaValue(
      attr.attributeType,
      attr.attribute_value,
      attr.attribute_object
    ),
    title: attr.def.title,
    placeholder: attr.def.placeholder,
    options: options &&
    typeof options === 'string' ?
      options.split(',') : [],
    helptext: attr.def.helptext,
    validation: attr.validation.attr(),
    validationConfig: attr.validationConfig,
    errorsMap: attr.errorsMap.attr(),
    valueId: can.compute(function () {
      return attr.attr('id');
    }),
  };
}

/**
 * Gets local or global custom attributes from the instance
 * @param  {can.Map} instance object instance
 * @param  {Number}  type     types of custom attributes we want to get
 *                            can be either CUSTOM_ATTRIBUTE_TYPE.LOCAL or
 *                            CUSTOM_ATTRIBUTE_TYPE.GLOBAL
 * @return {Array}            Array of filtered custom attributes
 */
function getCustomAttributes(instance, type) {
  let filterFn;
  let values = instance && instance.attr('custom_attribute_values') || [];
  switch (type) {
    case CUSTOM_ATTRIBUTE_TYPE.LOCAL:
      filterFn = function (v) {
        return v.def.definition_id !== null;
      };
      break;
    case CUSTOM_ATTRIBUTE_TYPE.GLOBAL:
      filterFn = function (v) {
        return v.def.definition_id === null;
      };
      break;
    default:
      throw new Error('Unknown attributes type ' + type);
  }
  return values
    .filter(filterFn)
    .sort(sortCustomAttributes);
}

function updateCustomAttributeValue(ca, value) {
  let id;
  if (ca.attr('attributeType') === 'person') {
    id = value || null;
    ca.attr('attribute_value', 'Person');
    ca.attr('attribute_object', {id: id, type: 'Person'});
  } else {
    ca.attr('attribute_value',
      convertToCaValue(ca.attr('attributeType'), value)
    );
  }
}

function applyChangesToCustomAttributeValue(values, changes) {
  can.Map.keys(changes).forEach(function (fieldId) {
    values.each(function (item, key) {
      if (item.def.id === Number(fieldId)) {
        if (!item) {
          console.error('Corrupted Date: ', values);
          return;
        }
        updateCustomAttributeValue(item, changes[fieldId]);
        values.splice(key, 1, values[key]);
      }
    });
  });
}

/**
 * Ensures that the Global Custom Attributes are present in the instance
 * @param  {can.Map} instance assessment instance
 * @return {Promise} Promise whichi is resolved when GCAs are present in
 *                   the assessment instance
 */
function ensureGlobalCA(instance) {
  let definitions;
  let values;
  let def = can.Deferred();
  if (instance.attr('id')) {
    def.resolve();
    return def.promise();
  }

  definitions = GGRC.custom_attr_defs.filter(function (gca) {
    return gca.definition_type === instance.constructor.root_object &&
      gca.definition_id === null;
  });

  values = prepareCustomAttributes(definitions, [])
    .sort(sortCustomAttributes);

  instance.attr('custom_attribute_definitions', definitions);
  instance.attr('custom_attribute_values', values);
}

export {
  convertFromCaValue,
  convertToCaValue,
  convertValuesToFormFields,
  prepareCustomAttributes,
  isEmptyCustomAttribute,
  getCustomAttributes,
  getCustomAttributeType,
  convertToFormViewField,
  applyChangesToCustomAttributeValue,
  CA_DD_REQUIRED_DEPS,
  ensureGlobalCA,
  CUSTOM_ATTRIBUTE_TYPE,
  CA_DD_FLAGS,
  ddValidationValueToMap,
  ddValidationMapToValue,
};
