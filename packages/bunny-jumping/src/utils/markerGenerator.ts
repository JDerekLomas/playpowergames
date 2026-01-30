const NUMBER_LINE_OPTIONS = [
  { start: 0, end: 10 },   // 0 to 10
  { start: 5, end: 15 },   // 5 to 15
  { start: 10, end: 20 }   // 10 to 20
];

/**
 * Generates markers for a question based on operand1 and answer being within the number line range
 * @param operand1 - First operand as string
 * @param operand2 - Second operand as string
 * @param operator - Operator ('+' or '-')
 * @returns String of markers as comma-separated numbers
 */
export function generateMarkersForQuestion(operand1: string, operand2: string, operator: string): string {
  const op1 = parseInt(operand1);
  const op2 = parseInt(operand2);
  
  const answer = operator === '+' ? op1 + op2 : op1 - op2;
  
  // Find the appropriate number line that contains both operand1 and answer
  const selectedRange = NUMBER_LINE_OPTIONS.find(range => 
    op1 >= range.start && op1 <= range.end && 
    answer >= range.start && answer <= range.end
  );
  
  // If no range contains both values, default to the widest range 0 to 20
  const range = selectedRange || { start: 0, end: 20 };
  
  // Generate all markers in the range
  const allMarkers: number[] = [];
  for (let i = range.start; i <= range.end; i++) {
    allMarkers.push(i);
  }

  const markers = allMarkers.join(',');
  
  return markers;
}
