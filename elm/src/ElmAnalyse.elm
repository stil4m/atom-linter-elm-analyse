module ElmAnalyse exposing (Message, decode, getCoords, getDescription, getShortMessage)

import Json.Decode exposing (Decoder, decodeValue, field, int, list, map2, map6, string)
import Json.Encode exposing (Value)


type alias Value =
    { file : String
    , range : List Int
    }


value : Decoder Value
value =
    map2 Value
        (field "file" string)
        (field "range" <| list int)


type alias Message =
    { files : List String
    , id : Int
    , message : String
    , status : String
    , type_ : String
    , value : Value
    }


message : Decoder Message
message =
    map6 Message
        (field "files" <| list string)
        (field "id" int)
        (field "message" string)
        (field "status" string)
        (field "type" string)
        (field "value" value)


decode : Json.Encode.Value -> List Message
decode rawJson =
    decodeValue (list message) rawJson
        |> Result.withDefault []


getCoords : Message -> List ( Int, Int )
getCoords message =
    reduce message.value.range


getShortMessage : Message -> String
getShortMessage message =
    String.split "in file" message.message
        |> List.head
        |> Maybe.withDefault ""


getDescription : Message -> String
getDescription message =
    ("**Type:** " ++ message.type_ ++ "<br/>")
        ++ ("**Reference URL:** https://stil4m.github.io/elm-analyse/#/messages/" ++ message.type_)


reduce : List Int -> List ( Int, Int )
reduce range =
    case range of
        a :: b :: rest ->
            ( a, b ) :: reduce rest

        _ ->
            []
