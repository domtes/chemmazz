import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button, Drawer, Form, InputNumber, Radio, Statistic } from 'antd';
import { GameContext } from '../context/store';
import { useStashManagement } from '../context/stashManagementContext';

const StashManagementDrawer = () => {
    const { state } = useContext(GameContext);
    const { visible, player, hide } = useStashManagement();
    const [form] = Form.useForm();
    const amountRef = useRef<any>(null);
    const [stashPreview, setStashPreview] = useState<number | undefined>(player?.stash);


    useEffect(() => {
        form.setFieldsValue({ amount: 0, action: 'add-to' });
        setStashPreview(player?.stash);
        if (amountRef && amountRef.current) {
            amountRef?.current.input.focus();
        }
    }, [player, form, amountRef, visible]);

    const handleValuesChange = useCallback((changed, all) => {
        if (!player) {
            return;
        }

        let preview = 0;
        switch (all.action) {
            case 'add-to':
                preview = player?.stash + all.amount;
                break;
            case 'remove-from':
                preview = Math.max(0, player?.stash - all.amount);
                break;
            case 'set':
                preview = all.amount;
                break;
        }
        setStashPreview(preview);
    }, [player]);

    const handleConfirm = useCallback(() => {
        const values = form.getFieldsValue();
        console.log('Operation confirmed:', values);
        state.room.send('admin', {
            command: `${values.action}-user-stash`,
            payload: { sessionId: player?.sessionId, amount: values.amount }
        });

        hide();
    }, [form, player, hide, state.room]);

    const handleAmountFocus = useCallback((event) => {
        event.target.select();
    }, []);

    return (
        <Drawer forceRender visible={visible} width={720}
            title={`Gestione fondi per ${player?.displayName}`}
            onClose={hide}
            footer={
                <div style={{ textAlign: 'right' }}>
                    <Button style={{ marginRight: 8 }} onClick={hide}>
                        Annulla
                    </Button>
                    <Button type="primary" onClick={handleConfirm}>
                        Conferma
                    </Button>
                </div>
            }>
            <Form
                form={form}
                layout="inline"
                initialValues={{ amount: 0, action: 'add-to' }}
                onValuesChange={handleValuesChange}
            >
                <Form.Item label="Operazione" name="action">
                    <Radio.Group>
                        <Radio.Button value="add-to">Aggiungi</Radio.Button>
                        <Radio.Button value="remove-from">Rimuovi</Radio.Button>
                        <Radio.Button value="set">Imposta</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="Importo" name='amount'>
                    <InputNumber ref={amountRef} min={0} max={10000} step={100} onFocus={handleAmountFocus} onPressEnter={handleConfirm} />
                </Form.Item>
            </Form>

            <div className="stash-preview">
                <Statistic value={`${player?.stash} ➞ ${stashPreview}`} title="Anteprima" />
            </div>
        </Drawer>
    )
};

export default StashManagementDrawer;
