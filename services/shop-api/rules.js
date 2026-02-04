// demo-app/rules.js

/**
 * Evaluates a boolean control for a given user.
 * If the control value is explicitly null, it returns false.
 * Otherwise, it returns the control's boolean value or undefined if not found.
 * @param {object} user - The user object.
 * @param {string} controlName - The name of the boolean control to evaluate.
 * @returns {boolean|undefined} The evaluated boolean value, or undefined if the control is not found.
 */
function evaluateBooleanControl(user, controlName) {
  if (user && user.controls && typeof user.controls[controlName] !== 'undefined') {
    const controlValue = user.controls[controlName];
    if (controlValue === null) {
      return false;
    }
    return Boolean(controlValue);
  }
  return undefined; // Control not found or user/controls object is missing
}

module.exports = {
  evaluateBooleanControl
};
