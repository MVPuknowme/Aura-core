# GitHub Workflow Rule Snippet

```yaml
- name: Enforce Aura Core failure rule
  run: |
    ATTEMPTS=1
    MAX_ATTEMPTS=3

    while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
      echo "Repair attempt $((ATTEMPTS+1))"

      # simulate check (replace with real condition)
      if [ -f "user_input.flag" ]; then
        echo "User input detected → proceed"
        exit 0
      fi

      ATTEMPTS=$((ATTEMPTS+1))
    done

    echo "❌ Max repair attempts reached"
    echo "Reference-only enforced until user input is provided"
    exit 1
```
