find ./public/assets -type f | while read -r file; do
    if file "$file" | grep -q "image"; then
        identify -format "%w,%h,%i\n" "$file" 2>/dev/null || echo "N/A,N/A,$file"
    else
        echo "N/A,N/A,$file"
    fi
done | sort -t, -k1,1n -k2,2n
