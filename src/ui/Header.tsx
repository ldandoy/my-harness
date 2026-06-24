import React from "react";
import { Box, Text } from "ink";
import { MODEL } from "../config";

export function Header() {
    return (
        <Box borderStyle="round" borderColor="green" paddingX={2} marginBottom={1}>
            <Text bold color="green">◆ my-harness</Text>
            <Text color="gray">{"  •  "}{MODEL}</Text>
        </Box>
    );
}