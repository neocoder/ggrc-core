/*!
  Copyright (C) 2017 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

'use strict';

describe('GGRC utils isEmptyCustomAttribute() method', function () {
  var isEmptyCA;

  beforeAll(function () {
    isEmptyCA = GGRC.Utils.CustomAttributes.isEmptyCustomAttribute;
  });

  describe('check undefined value', function () {
    it('returns true for undefined', function () {
      var result = isEmptyCA(undefined);
      expect(result).toBe(true);
    });
  });

  describe('check Rich Text value', function () {
    it('returns true for empty div', function () {
      var result = isEmptyCA('<div></div>', 'Rich Text');
      expect(result).toBe(true);
    });

    it('returns true for div with a line break', function () {
      var result = isEmptyCA('<div><br></div>', 'Rich Text');
      expect(result).toBe(true);
    });

    it('returns true for div with a empty list', function () {
      var result = isEmptyCA('<div><ul><li></li></ul></div>', 'Rich Text');
      expect(result).toBe(true);
    });

    it('returns true for div with a empty paragraph', function () {
      var result = isEmptyCA('<div><p></p></div>', 'Rich Text');
      expect(result).toBe(true);
    });

    it('returns false for div with the text', function () {
      var result = isEmptyCA('<div>Very important text!</div>', 'Rich Text');
      expect(result).toBe(false);
    });

    it('returns false for not empty list', function () {
      var result = isEmptyCA('<div><ul><li>One</li><li>Two</li></ul></div>',
        'Rich Text');
      expect(result).toBe(false);
    });
  });

  describe('check Checkbox value', function () {
    it('returns false for unchecked', function () {
      var result = isEmptyCA('0', 'Checkbox');
      expect(result).toBe(true);
    });

    it('returns true for checked', function () {
      var result = isEmptyCA('1', 'Checkbox');
      expect(result).toBe(false);
    });
  });

  describe('check Text value', function () {
    it('returns false for not empty', function () {
      var result = isEmptyCA('some text', 'Text');
      expect(result).toBe(false);
    });

    it('returns true for empty', function () {
      var result = isEmptyCA('', 'Text');
      expect(result).toBe(true);
    });
  });

  describe('check Map:Person type', function () {
    it('returns false for selected', function () {
      var result = isEmptyCA('Person', 'Map:Person');
      expect(result).toBe(false);
    });

    it('returns true for not selected', function () {
      var result = isEmptyCA('', 'Map:Person');
      expect(result).toBe(true);
    });

    it('returns true for not selected cav', function () {
      var result = isEmptyCA('', 'Map:Person', {attribute_object: null});
      expect(result).toBe(true);
    });

    it('returns false for selected cav', function () {
      var result = isEmptyCA('', 'Map:Person', {attribute_object: 'Person'});
      expect(result).toBe(false);
    });
  });

  describe('check Date type', function () {
    it('returns false for selected', function () {
      var result = isEmptyCA('01/01/2016', 'Date');
      expect(result).toBe(false);
    });

    it('returns true for not selected', function () {
      var result = isEmptyCA('', 'Date');
      expect(result).toBe(true);
    });
  });

  describe('check Dropdown type', function () {
    it('returns false for selected', function () {
      var result = isEmptyCA('value', 'Dropdown');
      expect(result).toBe(false);
    });

    it('returns true for not selected', function () {
      var result = isEmptyCA('', 'Dropdown');
      expect(result).toBe(true);
    });
  });

  describe('check invalid type', function () {
    it('returns false for invalid type', function () {
      var result = isEmptyCA('some value', 'Invalid');
      expect(result).toBe(false);
    });
  });
});

describe('GGRC utils conflict resolution', function () {
  var getDiffMap = GGRC.Utils.ConflictResolution.getDiffMap;

  describe('object diff function', function () {
    it('should traverse an one level object and return a change map',
    function () {
      var a = {
        x: 1, y: 2, z: 3
      };
      var am = {
        x: 1, y: 2, z: 4
      };

      var dm = getDiffMap(a, am);
      expect(dm).toEqual({
        z: {$from: 3, $to: 4}
      });
    });

    it('should traverse an simple mulilevel object and return a change map',
    function () {
      var a = {
        x: 1, y: 2, z: 3, zz: {foo: 'bar'}
      };
      var am = {
        x: 1, y: 2, z: 4, zz: {foo: 'baz'}
      };

      var dm = getDiffMap(a, am);
      expect(dm).toEqual({
        z: {$from: 3, $to: 4},
        'zz.foo': {$from: 'bar', $to: 'baz'}
      });
    });

    it('should traverse a mulilevel object with arrays and return a change map',
    function () {
      var a = {
        x: 1, y: 2, z: 3, zz: {foo: 'bar', arr: [1, 2, 3]}
      };
      var am = {
        x: 1, y: 2, z: 4, zz: {foo: 'bar', arr: [1, 2, 4]}
      };

      var dm = getDiffMap(a, am);

      expect(dm).toEqual({
        z: {$from: 3, $to: 4},
        'zz.arr[2]': {$from: 3, $to: 4}
      });
    });

    it('should traverse a mulilevel object with a field missing in the ' +
       '"from state" object',
    function () {
      var a = {
        y: 2, z: 3, zz: {foo: 'bar', arr: [1, 2, 3]}
      };
      var am = {
        x: 1, y: 2, z: 4, zz: {foo: 'bar', arr: [1, 2, 4]}
      };

      var dm = getDiffMap(a, am);

      expect(dm).toEqual({
        x: {$from: undefined, $to: 1},
        z: {$from: 3, $to: 4},
        'zz.arr[2]': {$from: 3, $to: 4}
      });
    });

    it('should traverse a mulilevel object with a field missing in the ' +
       '"to state" object',
    function () {
      var a = {
        x: 1, y: 2, z: 3, zz: {foo: 'bar', arr: [1, 2, 3]}
      };
      var am = {
        x: 1, y: 2, z: 4, zz: {foo: 'bar'}
      };

      var dm = getDiffMap(a, am);

      expect(dm).toEqual({
        z: {$from: 3, $to: 4},
        'zz.arr': {$from: [1, 2, 3], $to: undefined}
      });
    });

    it('should traverse an object with sub-objects in arrays',
    function () {
      var a = {
        x: 1, y: 2, z: 3, items: [
          {one: 1, two: 2},
          {three: 3, four: 4}
        ]
      };
      var am = {
        x: 1, y: 2, z: 4, items: [
          {one: 1, two: 22},
          {three: 3, four: 4}
        ]
      };

      var dm = getDiffMap(a, am);

      expect(dm).toEqual({
        z: {$from: 3, $to: 4},
        'items[0].two': {$from: 2, $to: 22}
      });
    });

    it('should traverse an object and check only specific fields',
    function () {
      var dm;
      var a = {
        x: 1, y: 2, z: 3, zz: {foo: 'bar'}, hello: 'word'
      };
      var am = {
        x: 1, y: 2, z: 4, zz: {foo: 'baz'}, hello: 'universe'
      };
      var checkFields = ['x', 'y', 'z', 'zz'];

      expect(a.hello).not.toBe(am.hello);

      dm = getDiffMap(a, am, checkFields);
      expect(dm).toEqual({
        z: {$from: 3, $to: 4},
        'zz.foo': {$from: 'bar', $to: 'baz'}
      });
    });
  });
});
