// This is an example file to demonstrate the CopyFileHighlights feature
// Use !clibbits markers to highlight specific blocks of code

// This comment will NOT be copied when using CopyFileHighlights

// !clibbits
/**
 * This function is IMPORTANT and will be copied when using CopyFileHighlights
 * Because it's surrounded by !clibbits markers
 */
function importantFunction() {
  console.log("This is an important function");
  return true;
}
// !clibbits

// This code will NOT be copied

/**
 * This is just a regular function
 */
function regularFunction() {
  console.log("This is just a regular function");
  return false;
}

// !clibbits
// Here's another highlighted block
const highlightedConstant = {
  name: "Important Constant",
  value: 42,
  isHighlighted: true
};

// You can add as many highlighted blocks as needed
// Each block starts after a line with !clibbits
// And ends before the next line with !clibbits
// !clibbits

// This will NOT be copied

// !clibbits
// You can have multiple blocks, and they'll all be copied
class ImportantClass {
  constructor(private name: string) {}
  
  getName(): string {
    return this.name;
  }
}
// !clibbits

// End of file - this will NOT be copied
