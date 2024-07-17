for i in {1..400}; do
    curl -X POST https://raphaeltm-api--3000.prod1.defang.dev/task \
        -H "Content-Type: application/json" \
        -d '{"name": "exampleTaskName", "data": "exampleTaskData"}' \
        --silent --output /dev/null &
done
