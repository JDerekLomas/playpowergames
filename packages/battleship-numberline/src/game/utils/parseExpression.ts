export function formatMathExpression(expression: string): string {
    // Check if the expression contains words (letters)
    const containsWords = /[a-zA-Z]/.test(expression);
    
    // If it contains words, return as-is to preserve spaces
    if (containsWords) {
        return expression;
    }
    
    // Normalize different types of minus signs to the proper minus sign
    let result = expression.replace(/[-−–]/g, "−");
    
    // Mark mixed fractions with a placeholder before removing spaces
    // This will help us restore them correctly later
    result = result.replace(/(\d+)\s+(\d+\/\d+)/g, '$1§§§$2');
    
    // Remove all spaces first
    result = result.replace(/\s+/g, '');
    
    // Add spaces around operators, but handle special cases
    result = result.replace(/([+−×÷])(?=\d)/g, '$1 ');
    result = result.replace(/(\d)(?=[+−×÷])/g, '$1 ');
    
    // Remove spaces before opening parentheses
    result = result.replace(/\s+\(/g, '(');
    
    // Remove spaces after closing parentheses
    result = result.replace(/\)\s+/g, ')');
    
    // Restore mixed fraction format by replacing placeholder with space
    result = result.replace(/§§§/g, ' ');
    
    // Remove spaces around fraction bars, but preserve mixed fraction spaces
    result = result.replace(/\s+\//g, '/');
    result = result.replace(/\/\s+/g, '/');
    
    // Handle negative numbers at the beginning (no space before first operand)
    result = result.replace(/^([+−×÷])\s+/, '$1');
    
    // Handle negative numbers after operators (no space before negative sign)
    result = result.replace(/([+−×÷])\s+([+−])/g, '$1$2');
    
    // Add space between operator and opening parenthesis if missing
    result = result.replace(/([+−×÷])\(/g, '$1 (');
    
    // Remove space between minus sign and number inside parentheses
    result = result.replace(/\(\s*−\s+/g, '(−');
    
    // Clean up any double spaces
    result = result.replace(/\s+/g, ' ');
    
    // Trim leading/trailing spaces
    result = result.trim();
    
    return result;
}