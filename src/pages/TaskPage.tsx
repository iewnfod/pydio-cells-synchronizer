import {
    Box,
    Button,
    ButtonGroup,
    Chip,
    FormLabel,
    IconButton,
    LinearProgress,
    Sheet,
    Table,
    Typography
} from "@mui/joy";
import {Task} from "../interfaces.ts";
import {useEffect, useState} from "react";
import {
    getValueFromStorage,
    GLOABL_IGNORES_STORAGE_KEY,
    LARGE_PART,
    PAD,
    SMALL_PART,
    TASKS_STORAGE_KEY, TYPOGRAPHY_OVERFLOW_SX
} from "../constants.ts";
import LogoutIcon from '@mui/icons-material/Logout';
import AddIcon from '@mui/icons-material/Add';
import CreateTaskModal from "../modals/CreateTaskModal.tsx";
import {getName} from "../modals/RemoteSelectModal.tsx";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditTaskModalWithButton from "../modals/EditTaskModal.tsx";
import {callBackend} from "../Utils.ts";
import IgnoresInput from "../components/IgnoresInput.tsx";
import React from "react";

export default function TaskPage() {
    const [tasks, _setTasks] = useState<Task[]>(
        JSON.parse(getValueFromStorage(TASKS_STORAGE_KEY, "[]"))
    );
    const [globalIgnores, _setGlobalIgnores] = useState<string[]>(
        JSON.parse(getValueFromStorage(GLOABL_IGNORES_STORAGE_KEY, "[]"))
    );

    const [taskModalOpen, setTaskModalOpen] = useState(false);

    const [progresses, setProgresses] = useState<Map<string, number>>(new Map());

    useEffect(() => {
        tasks.map((t) => {
            if (!t.paused) {
                sync(t);
            }
        });
    }, []);

    function setGlobalIgnores(ignores: string[]) {
        localStorage.setItem(GLOABL_IGNORES_STORAGE_KEY, JSON.stringify(ignores));
        _setGlobalIgnores(ignores);
    }

    function setTasks(newTasks: Task[]) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
        _setTasks(newTasks);
    }

    function handleNewTask() {
        setTaskModalOpen(true);
    }

    function createTask(newTask: Task) {
        setTasks([...tasks, newTask])
    }

    function handleLogout() {
        callBackend("set_username", {value: ""}).then();
        callBackend("set_password", {value: ""}).then();
        window.location.href = "/";
    }

    function handlePlay(task: Task) {
        let newTask = {
            ...task,
            paused: false,
        };
        saveTask(newTask);
        sync(newTask);
    }

    function sync(task: Task) {
        console.log("sync", task.uuid);
        callBackend("sync", {
            task: task,
            ignores: globalIgnores,
        }).then(() => {
            getProgress(task.uuid);
            let ts: Task[] = JSON.parse(getValueFromStorage(TASKS_STORAGE_KEY, JSON.stringify(tasks)));
            let t = ts.find(ts => ts.uuid === task.uuid);
            if (t && !t.paused) {
                setTimeout(() => {
                    let ts: Task[] = JSON.parse(getValueFromStorage(TASKS_STORAGE_KEY, JSON.stringify(tasks)));
                    let t = ts.find(ts => ts.uuid === task.uuid);
                    if (t && !t.paused) {
                        console.log(`Repeat ${t.uuid}`);
                        sync(t);
                    }
                }, t.repeatInterval * t.repeatIntervalUnit.level * 1000);
            }
        }).catch();
    }

    function handlePause(task: Task) {
        let newTask = {
            ...task,
            paused: true,
        };
        callBackend("pause", {
            uuid: task.uuid,
        }).then(() => {
            saveTask(newTask);
        }).catch(() => {
            saveTask(newTask);
        });
    }

    function saveTask(newTask: Task) {
        let index = -1;
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].uuid === newTask.uuid) {
                index = i;
                break;
            }
        }
        if (index === -1) return;
        let newTasks = JSON.parse(JSON.stringify(tasks));
        newTasks[index] = newTask;
        setTasks(newTasks);
    }
    
    function handleDelete(task: Task) {
        let newTasks = JSON.parse(JSON.stringify(tasks));
        if (tasks.indexOf(task) !== -1) {
            newTasks.splice(tasks.indexOf(task), 1);
        }
        setTasks(newTasks);
    }

    function getProgress(uuid: string, task?: Task) {
        let ts: Task[] = JSON.parse(getValueFromStorage(TASKS_STORAGE_KEY, JSON.stringify(tasks)));
        task = task || ts.find(t => t.uuid === uuid);
        if (task && !task.paused) {
            callBackend('progress', {
                uuid: task.uuid
            }).then((res) => {
                let percent = 0;
                if (res) {
                    percent = res.data.current / res.data.total * 100;
                    percent = parseFloat(percent.toFixed(2));
                }

                let newProgresses = new Map(progresses);
                newProgresses.set(task.uuid, percent);
                setProgresses(newProgresses);

                setTimeout(() => {
                    getProgress(uuid);
                }, 500);
            }).catch((err) => {
                console.log(err);
                setTimeout(() => {
                    getProgress(uuid);
                }, 500);
            });
        }
    }

    return (
        <Box sx={{height: '90vh', display: 'flex', flexDirection: 'column', gap: PAD, overflow: 'hidden'}}>
            <Box sx={{
                pl: PAD, pr: PAD, pb: PAD,
                display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Typography level="title-lg">
                    Tasks
                </Typography>
                <ButtonGroup>
                    <Button
                        onClick={() => handleNewTask()}
                        startDecorator={<AddIcon/>}
                    >
                        New Task
                    </Button>
                    <IconButton onClick={() => handleLogout()}>
                        <LogoutIcon/>
                    </IconButton>
                </ButtonGroup>
            </Box>
            <Sheet>
                <Box sx={{
                    overflowY: 'auto', flex: 1,
                    height: `${LARGE_PART + SMALL_PART / 2}vh`
                }}>
                <Table
                    stickyHeader
                    stickyFooter
                    sx={{
                        pl: PAD, pr: PAD, pb: PAD,
                        '& tr > :last-child': { textAlign: 'right' },
                        height: '100%'
                    }}
                >
                    <thead>
                    <tr>
                        <th>Local Dir</th>
                        <th>Remote Dir</th>
                        <th>Ignored</th>
                        <th style={{width: '15%'}}>Repeat Interval</th>
                        <th style={{width: '10%'}}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {tasks.map((task: Task) => (
                        <React.Fragment key={task.uuid}>
                            <tr>
                                <td>
                                    <Typography sx={TYPOGRAPHY_OVERFLOW_SX}>
                                        {task.localDir}
                                    </Typography>
                                </td>
                                <td>
                                    <Box sx={{
                                        display: 'flex',
                                        flexFlow: 'row wrap',
                                        justifyContent: 'flex-start',
                                        alignItems: 'center',
                                        gap: PAD / 2,
                                        flexDirection: 'row'
                                    }}>
                                        <Typography sx={TYPOGRAPHY_OVERFLOW_SX}>
                                            {getName(task.remoteDir)}
                                        </Typography>
                                        <Typography sx={TYPOGRAPHY_OVERFLOW_SX}>
                                            ({task.remoteDir.Path})
                                        </Typography>
                                    </Box>
                                </td>
                                <td>
                                    <Box sx={{
                                        display: 'flex',
                                        flexFlow: 'row wrap',
                                        justifyContent: 'flex-start',
                                        alignItems: 'center',
                                        gap: PAD / 2,
                                        flexDirection: 'row'
                                    }}>
                                        {
                                            task.ignores.map((ignore, index) => (
                                                <Chip key={index}>{ignore}</Chip>
                                            ))
                                        }
                                    </Box>
                                </td>
                                <td>
                                    <Typography sx={TYPOGRAPHY_OVERFLOW_SX}>
                                        {task.repeatInterval} {task.repeatIntervalUnit.name}
                                    </Typography>
                                </td>
                                <td>
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        justifyContent: 'flex-end',
                                        alignItems: 'center'
                                    }}>
                                        <ButtonGroup
                                            aria-label="radius primary button group"
                                            sx={{'--ButtonGroup-radius': '40px'}}
                                            size="sm"
                                            orientation="vertical"
                                        >
                                            {
                                                task.paused ? (
                                                    <IconButton onClick={() => handlePlay(task)}>
                                                        <PlayArrowIcon/>
                                                    </IconButton>
                                                ) : (
                                                    <IconButton onClick={() => handlePause(task)}>
                                                        <PauseIcon/>
                                                    </IconButton>
                                                )
                                            }
                                            <EditTaskModalWithButton
                                                task={task}
                                                saveTask={saveTask}
                                            />
                                            <IconButton onClick={() => handleDelete(task)}>
                                                <DeleteOutlineIcon/>
                                            </IconButton>
                                        </ButtonGroup>
                                    </Box>
                                </td>
                            </tr>
                            {
                                task.paused || (progresses.get(task.uuid) || 0) === 0 ?
                                    <></>
                                : (
                                    <tr>
                                        <td colSpan={5} style={{textAlign: 'center'}}>
                                            <Box sx={{
                                                display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
                                                alignItems: 'center', gap: PAD
                                            }}>
                                                <LinearProgress
                                                    determinate
                                                    value={progresses.get(task.uuid) || 0}
                                                    sx={{flexGrow: 1}}
                                                />
                                                <Typography level="body-sm">
                                                    {progresses.get(task.uuid) || 0}%
                                                </Typography>
                                            </Box>
                                        </td>
                                    </tr>
                                    )
                            }
                        </React.Fragment>
                    ))}
                    </tbody>
                    <tfoot>
                    <tr>
                        <td colSpan={5} style={{textAlign: 'center'}}>
                            <Box sx={{width: '100%', pb: PAD}}>
                                <FormLabel sx={{p: PAD / 2}}>
                                    Global Ignore
                                </FormLabel>
                                <IgnoresInput ignores={globalIgnores} setIgnores={setGlobalIgnores}/>
                            </Box>
                        </td>
                    </tr>
                    </tfoot>
                </Table>
                </Box>
            </Sheet>
            <Box sx={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}>
                {
                    tasks.length === 0 ?
                        <Typography level="title-lg">
                            Try to add a new sync task!
                        </Typography>
                        : <></>
                }
            </Box>
            <CreateTaskModal
                open={taskModalOpen}
                setOpen={setTaskModalOpen}
                createTask={createTask}
            />
        </Box>
    );
}
