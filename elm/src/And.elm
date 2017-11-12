port module And exposing (execute, noCommand, sendLintsToEditor)

import AtomLinter
import Model exposing (Model)
import Transform


noCommand : model -> ( model, Cmd message )
noCommand model =
    ( model, Cmd.none )


execute : Cmd message -> model -> ( model, Cmd message )
execute command model =
    ( model, command )


sendLintsToEditor : Model -> ( Model, Cmd message )
sendLintsToEditor model =
    ( model, sendLints <| Transform.analysesToLints model.projectPath model.analyses )


port sendLints : List AtomLinter.Message -> Cmd message
