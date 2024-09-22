import {Box, Button, Chip, ChipDelete, Input} from "@mui/joy";
import {PAD, SMALL_PART} from "../constants.ts";
import {useState} from "react";

export default function IgnoresInput({
    ignores,
    setIgnores
} : {
    ignores: string[],
    setIgnores: (ignores: string[]) => void
}) {
    const [newIgnore, setNewIgnore] = useState<string>("");

    function handleDeleteIgnore(ignore: string) {
        ignore = ignore.trim();
        if (ignores.indexOf(ignore) !== -1) {
            const newIgnores = JSON.parse(JSON.stringify(ignores));
            newIgnores.splice(ignores.indexOf(ignore), 1);
            setIgnores(newIgnores);
        }
    }

    function handleAddIgnore() {
        let ignore = newIgnore.trim();
        if (ignore.length > 0 && ignores.indexOf(ignore) === -1) {
            setIgnores([...ignores, ignore]);
            setNewIgnore("");
        }
    }

    return (
        <Box sx={{
            width: '100%', display: 'flex', flexDirection: 'row', flexGrow: 1,
            justifyContent: 'flex-start', alignItems: 'center',
            flexFlow: 'row wrap', gap: PAD
        }}>
            {
                ignores.map((ignore, index) => (
                    <Chip
                        key={index}
                        endDecorator={
                            <ChipDelete onDelete={() => handleDeleteIgnore(ignore)}/>
                        }
                    >
                        {ignore}
                    </Chip>
                ))
            }
            <form onSubmit={(e) => {
                e.preventDefault();
                handleAddIgnore();
            }} style={{flexGrow: 1, minWidth: `${SMALL_PART}%`}}>
                <Input
                    sx={{width: '100%'}}
                    value={newIgnore}
                    onChange={(event) => setNewIgnore(event.target.value)}
                    endDecorator={
                        <Button variant="soft" color="neutral" type="submit">
                            Add
                        </Button>
                    }
                />
            </form>
        </Box>
    );
}