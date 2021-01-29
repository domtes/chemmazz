import { FC, useCallback, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button, Col, Form, InputNumber, Row, Space, Slider } from 'antd';
import { GameContext } from '../context/store';

interface PromptProps {
    prompt: any
}

const layout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
};

const tailLayout = {
    wrapperCol: { offset: 8, span: 16 },
};

const Prompt: FC<PromptProps> = ({ prompt }) => {
    const { state } = useContext(GameContext);
    const [bet, setBet] = useState<number>(10);
    const [action, setAction] = useState<"more" | "stand">("stand");
    const [form] = Form.useForm();

    const handleValuesChange = useCallback((changedValues, allValues) => {
        console.log('Values changed:', changedValues, allValues);
        if (Object.keys(changedValues).includes('bet')) {
            setBet(changedValues.bet);
        }
    }, [setBet]);

    const handleBetChange = useCallback(value => {
        form.setFieldsValue({ bet: value });
    }, [form]);

    const handleButtonClick = useCallback(value => {
        setAction(value);
        form.submit();
    }, [form, setAction]);

    const onFinish = useCallback((values: any) => {
        console.log('Success:', { ...values, action });
        state.room.send('resolve-prompt', { ...values, action });
        form.setFieldsValue({ bet: 10 });
        setBet(10);
    }, [state.room, form, action, setBet]);

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    if (prompt === undefined || !prompt.visible) {
        return <></>;
    }

    return (
        <Form
            {...layout}
            form={form}
            name="basic"
            initialValues={{
                bet: bet,
            }}
            onValuesChange={handleValuesChange}
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
        >
            {prompt.fields.map((field) => {
                return (
                    <Form.Item key={`${uuidv4()}`}
                        label={field.label}
                    >
                        <Row>
                            <Col span={12}>
                                <Slider
                                    step={1}
                                    min={field.min}
                                    max={field.max}
                                    defaultValue={bet}
                                    onChange={handleBetChange}
                                />
                            </Col>
                            <Col span={4}>
                                <Form.Item name={field.name}>
                                    <InputNumber
                                        style={{ margin: '0 16px' }}
                                        min={field.min}
                                        max={field.max}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form.Item>
                )
            })}

            <Form.Item {...tailLayout}>
                <Space>
                    {prompt.buttons.map((button) => {
                        return (
                            <Button
                                key={`${uuidv4()}`}
                                type={button.type}
                                value={button.name}
                                onClick={() => {
                                    handleButtonClick(button.name);
                                }}>
                                {button.label}
                            </Button>
                        )
                    })}
                </Space>
            </Form.Item>
        </Form>
    )
}

export default Prompt;
