port module Main exposing (main)

import And
import ElmAnalyse
import Json.Encode exposing (Value)
import Model.Analyses


type alias Model =
    { projectPath : String
    , analyses : List ElmAnalyse.Message
    }


type Message
    = SetProjectPath String
    | ProcessMessages Value


main : Program Never Model Message
main =
    Platform.program
        { init = init
        , update = update
        , subscriptions = subscriptions
        }


init : ( Model, Cmd Message )
init =
    { projectPath = "", analyses = [] }
        |> And.noCommand


update : Message -> Model -> ( Model, Cmd Message )
update message model =
    case message of
        SetProjectPath projectPath ->
            { model | projectPath = projectPath }
                |> And.noCommand

        ProcessMessages rawJson ->
            Model.Analyses.process rawJson model
                |> And.noCommand


subscriptions : Model -> Sub Message
subscriptions model =
    Sub.batch
        [ setProjectPath SetProjectPath
        , processMessages ProcessMessages
        ]


port processMessages : (Value -> message) -> Sub message


port setProjectPath : (String -> message) -> Sub message
