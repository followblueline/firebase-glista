var modalGeneric = {
    props: {
        name: String
    },
    created: function(){

    },
    data: function(){
        return {}
    },
    mathods: {

    },
    template: `
    <transition name="modal">
        <div class="modal-mask">
            <div class="modal-wrapper">
                <div class="modal-container">
    
                    <div class="modal-header">
                        <slot name="header"></slot>
                    </div>
    
                    <div class="modal-body">
                        <slot name="body"></slot>
                    </div>
                        
                    <div class="modal-footer">
                        <slot name="footer">
                            <button class="modal-default-button" @click="$emit('close')">OK</button>
                        </slot>
                    </div>
                </div>
            </div>
        </div>
    </transition>`
}