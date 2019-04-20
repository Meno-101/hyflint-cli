const C = require('./constants');
const { html5ElementSet, deprecatedHtmlElementSet } = require('./html-elements');
const { isPascalCase } = require('./helpers');

function JSXElement(node, state, c) {
  const { openingElement, children } = node;
  c(openingElement, state);
  children.forEach(child => c(child, state));
}

function JSXOpeningElement(node, state, c) {
  const { name, loc } = node;
  if (name.type === 'JSXIdentifier') {
    if (deprecatedHtmlElementSet.has(name.name)) {
      state.logger.log(loc.start.line, C.ERROR, {
        message: C.DEPRECATED_HTML_ELEMENT,
        kind: 'htmlElement',
        name: name.name,
      });
    } else if (!html5ElementSet.has(name.name) && !isPascalCase(name.name)) {
      state.logger.log(loc.start.line, C.ERROR, {
        message: C.USE_PASCAL_CASE,
        kind: 'Component',
        name: name.name,
      });
    }
  }
  node.attributes.forEach(attr => c(attr, state));
}

function JSXAttribute(node, state, c) {
  const { name, value } = node;
  c(name, state);
  if (value) {
    c(value, state);
  }
}

function JSXExpressionContainer(node, state, c) {
  c(node.expression, state);
}

function JSXMemberExpression(node, state, c) {
  c(node.object, state);
  c(node.property, state);
}

function JSXIdentifier(node, state) {
  const { name, loc } = node;
  // skip CSS-style names
  if (!/-/.test(name)) {
    state.checkName(name, 'JsxIdentifier', loc);
  }
}

function JSXFragment(node, state, c) {
  c(node.openingFragment, state);
  node.children.forEach(child => c(child, state));
}

function JSXOpeningFragment(node, state, c) {
  node.attributes.forEach(attr => c(attr, state));
}

function JSXSpreadAttribute(node, state, c) {
  c(node.argument, state);
}

function JSXText() {}

module.exports = {
  JSXElement,
  JSXOpeningElement,
  JSXAttribute,
  JSXExpressionContainer,
  JSXMemberExpression,
  JSXIdentifier,
  JSXFragment,
  JSXOpeningFragment,
  JSXSpreadAttribute,
  JSXText,
};
