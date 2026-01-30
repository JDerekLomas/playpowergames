#!/bin/bash

# Function to normalize filenames and directory names
normalize_name() {
  # Convert spaces to underscores, remove special characters and convert to lowercase
  echo "$1" | sed -e 's/ /_/g' -e 's/[^a-zA-Z0-9_\/.-]//g' -e 's/--*/-/g' | tr '[:upper:]' '[:lower:]'
}

# Function to rename a folder or file
normalize_folder_or_file() {
  for file in "$1"/*; do
    if [ -d "$file" ]; then
      # Normalize folder name
      new_name=$(normalize_name "$file")
      if [ "$new_name" != "$file" ]; then
        mv "$file" "$new_name"
        echo "Renamed folder: $file -> $new_name"
      fi
      # Recursively process subdirectories
      normalize_folder_or_file "$new_name"
    elif [ -f "$file" ]; then
      # Normalize file name
      new_name=$(normalize_name "$file")
      if [ "$new_name" != "$file" ]; then
        mv "$file" "$new_name"
        echo "Renamed file: $file -> $new_name"
      fi
    fi
  done
}

# Call the function on the provided root directory (starting point)
root_dir="./public/assets"
normalize_folder_or_file "$root_dir"
