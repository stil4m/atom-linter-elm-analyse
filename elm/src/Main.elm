port module Main exposing (main)

import And
import ElmAnalyse
import Json.Encode exposing (Value)
import Model.Analyses


type alias Model =
    { analyses : List ElmAnalyse.Message
    }


type Message
    = ProcessMessages Value


main : Program Never Model Message
main =
    Platform.program
        { init = init
        , update = update
        , subscriptions = subscriptions
        }


init : ( Model, Cmd Message )
init =
    { analyses = [] }
        |> And.noCommand


update : Message -> Model -> ( Model, Cmd Message )
update message model =
    case message of
        ProcessMessages rawJson ->
            Model.Analyses.process rawJson model
                |> And.noCommand


subscriptions : Model -> Sub Message
subscriptions model =
    Sub.batch
        [ processMessages ProcessMessages
        ]


port processMessages : (Value -> message) -> Sub message
