import {
    Button,
    ButtonGroup, DialogContent,
    DialogTitle, Divider,
    FormControl,
    FormLabel, Input,
    Modal,
    ModalDialog, Option, Select,
    Stack
} from "@mui/joy";
import React, {useState} from "react";
import {HOUR_UNIT, LARGE_PART, PAD2, UNITS} from "../constants.ts";
import {open as selectLocal} from "@tauri-apps/api/dialog";
import RemoteSelectModal, {getName} from "./RemoteSelectModal.tsx";
import {BulkNode, Task} from "../interfaces.ts";
import toast from "react-hot-toast";
import {v1 as uuid1} from "uuid";
import IgnoresInput from "../components/IgnoresInput.tsx";

export default function CreateTaskModal({
    open,
    setOpen,
    createTask,
} : {
    open: boolean,
    setOpen: (open: boolean) => void,
    createTask: (newTask: Task) => void,
}) {
    const [localPath, setLocalPath] = useState("");
    const [remoteNode, setRemoteNode] =
        useState<BulkNode | undefined>(undefined);
    const [ignores, setIgnores] = useState<string[]>([]);

    const [interval, setInterval] = useState(1);
    const [intervalUnit, setIntervalUnit] = useState(HOUR_UNIT);

    const [remoteModalOpen, setRemoteModalOpen] = useState(false);

    function handleSelectLocal() {
        selectLocal({
            multiple: false,
            directory: true
        }).then((dir) => {
            if (dir) {
                setLocalPath(dir.toString());
            }
        });
    }

    function handleSelectRemote() {
        setRemoteModalOpen(true);
    }

    function handleCreate() {
        if (localPath.length === 0) {
            toast.error("Local directory should not be empty.");
            return;
        }
        if (remoteNode === undefined) {
            toast.error("Remote directory should not be empty.");
            return;
        }
        if (interval.toString().length === 0) {
            toast.error("Repeat interval should not be empty.");
            return;
        }

        let newTask: Task = {
            uuid: uuid1().toString(),
            localDir: localPath,
            remoteDir: remoteNode,
            ignores: ignores,
            paused: true,
            repeatInterval: interval,
            repeatIntervalUnit: intervalUnit
        };

        createTask(newTask);
        setOpen(false);
    }

    return (
        <Modal
            open={open}
            onClose={() => {
                setOpen(false);
            }}
        >
            <ModalDialog sx={{width: `${LARGE_PART}%`}}>
                <DialogTitle>
                    Create new task
                </DialogTitle>
                <DialogContent>
                    Fill in the information of the task.
                </DialogContent>
                <DialogContent sx={{overflowX: 'hidden'}}>
                    <Stack spacing={PAD2}>
                        <FormControl>
                            {
                                localPath.length > 0 ? (
                                    <FormLabel>{localPath}</FormLabel>
                                ) : (
                                    <></>
                                )
                            }
                            <ButtonGroup sx={{width: '100%'}}>
                                <Button sx={{width: '100%'}} onClick={() => handleSelectLocal()}>
                                    Select local directory
                                </Button>
                            </ButtonGroup>
                        </FormControl>
                        <FormControl>
                            {
                                remoteNode !== undefined ? (
                                    <FormLabel>
                                        {getName(remoteNode)} ({remoteNode.Path})
                                    </FormLabel>
                                ) : (
                                    <></>
                                )
                            }
                            <ButtonGroup sx={{width: '100%'}}>
                                <Button sx={{width: '100%'}} onClick={() => handleSelectRemote()}>
                                    Select remote directory
                                </Button>
                            </ButtonGroup>
                            <RemoteSelectModal
                                open={remoteModalOpen}
                                setOpen={setRemoteModalOpen}
                                onSelect={(node) => {
                                    setRemoteNode(node);
                                }}
                            />
                        </FormControl>
                        <Divider/>
                        <FormControl>
                            <FormLabel>
                                Ignore Files & Dirs
                            </FormLabel>
                            <IgnoresInput ignores={ignores} setIgnores={setIgnores}/>
                        </FormControl>
                        <Divider/>
                        <FormControl>
                            <FormLabel>
                                Repeat Interval
                            </FormLabel>
                            <Input
                                sx={{width: '100%'}}
                                value={interval}
                                type='number'
                                onChange={(e) => setInterval(
                                    parseFloat(e.target.value) || interval
                                )}
                                endDecorator={
                                    <React.Fragment>
                                        <Divider orientation="vertical"/>
                                        <Select
                                            variant="plain"
                                            value={intervalUnit}
                                            onChange={(_, value) => setIntervalUnit(value || intervalUnit)}
                                            slotProps={{
                                                listbox: {
                                                    variant: 'outlined',
                                                },
                                            }}
                                            sx={{ mr: -1.5, '&:hover': { bgcolor: 'transparent' } }}
                                        >
                                            {
                                                UNITS.map((unit, index) => (
                                                    <Option
                                                        key={index}
                                                        value={unit}
                                                    >{unit.name}</Option>
                                                ))
                                            }
                                        </Select>
                                    </React.Fragment>
                                }
                            />
                        </FormControl>
                        <FormControl>
                            <Button variant="soft" onClick={() => handleCreate()}>
                                Create
                            </Button>
                        </FormControl>
                    </Stack>
                </DialogContent>
            </ModalDialog>
        </Modal>
    );
}
